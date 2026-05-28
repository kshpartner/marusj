const express = require("express");
const { getPool, hasDatabaseConfig, sql } = require("../db");

const router = express.Router();

router.post("/", async (req, res, next) => {
  const {
    refUid,
    name,
    phone,
    age,
    gender,
    region,
    email,
    agreedTerms,
    agreedPrivacy,
    agreedMarketing = false,
  } = req.body;

  const parsedAge = Number(age);

  if (
    !refUid ||
    !name ||
    !phone ||
    !Number.isInteger(parsedAge) ||
    parsedAge < 1 ||
    parsedAge > 120 ||
    !gender ||
    !region ||
    !agreedTerms ||
    !agreedPrivacy
  ) {
    return res.status(400).json({ message: "필수 가입 정보를 확인해주세요." });
  }

  try {
    if (!hasDatabaseConfig()) {
      return res.status(201).json({
        member: {
          id: Date.now(),
          uid: `member_${Date.now()}`,
          parentUid: refUid,
          name,
          phone,
          age: parsedAge,
          gender,
          region,
          email,
          status: "pending",
        },
      });
    }

    const pool = await getPool();
    const parent = await pool
      .request()
      .input("refUid", sql.NVarChar, refUid)
      .query(`
        SELECT TOP 1 uid, role
        FROM dbo.MaruPartnerUsers
        WHERE uid = @refUid
          AND role IN ('admin', 'sales')
          AND status = 'active'
      `);

    if (!parent.recordset[0]) {
      return res.status(400).json({ message: "상조 회원은 admin 또는 영업사원 링크로만 가입할 수 있습니다." });
    }

    const activeTerms = await pool.request().query(`
      SELECT id, type, title, version, required_yn AS requiredYn
      FROM dbo.MaruPartnerTerms
      WHERE scope = 'funeral_member'
        AND active_yn = 'Y'
    `);

    const requiredTerms = activeTerms.recordset.filter((term) => term.requiredYn === "Y");
    const hasRequiredAgreement = requiredTerms.every((term) => {
      if (term.type === "service_terms") {
        return agreedTerms;
      }

      if (term.type === "privacy_policy") {
        return agreedPrivacy;
      }

      return true;
    });

    if (!hasRequiredAgreement) {
      return res.status(400).json({ message: "필수 약관 동의가 필요합니다." });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const result = await new sql.Request(transaction)
        .input("refUid", sql.NVarChar, refUid)
        .input("name", sql.NVarChar, name)
        .input("phone", sql.NVarChar, phone)
        .input("age", sql.Int, parsedAge)
        .input("gender", sql.NVarChar, gender)
        .input("region", sql.NVarChar, region)
        .input("email", sql.NVarChar, email || null)
        .input("termsYn", sql.Char, agreedTerms ? "Y" : "N")
        .input("privacyYn", sql.Char, agreedPrivacy ? "Y" : "N")
        .input("marketingYn", sql.Char, agreedMarketing ? "Y" : "N")
        .query(`
          INSERT INTO dbo.MaruPartnerUsers (
            uid, username, name, phone, age, gender, region, email, role, parent_uid, status,
            terms_yn, privacy_yn, marketing_yn, signup_source
          )
          OUTPUT INSERTED.id, INSERTED.uid, INSERTED.parent_uid AS parentUid, INSERTED.name,
                 INSERTED.phone, INSERTED.age, INSERTED.gender, INSERTED.region, INSERTED.email, INSERTED.status
          VALUES (
            CONCAT('member_', NEXT VALUE FOR dbo.MaruPartnerMemberUidSeq),
            @phone, @name, @phone, @age, @gender, @region, @email, 'funeral_member', @refUid, 'pending',
            @termsYn, @privacyYn, @marketingYn, 'terms_link'
          )
        `);

      const member = result.recordset[0];
      const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || null;
      const userAgent = req.headers["user-agent"] || null;

      for (const term of activeTerms.recordset) {
        let agreedYn = "N";
        if (term.type === "service_terms") {
          agreedYn = agreedTerms ? "Y" : "N";
        } else if (term.type === "privacy_policy") {
          agreedYn = agreedPrivacy ? "Y" : "N";
        } else if (term.type === "marketing_consent") {
          agreedYn = agreedMarketing ? "Y" : "N";
        }

        await new sql.Request(transaction)
          .input("userUid", sql.NVarChar, member.uid)
          .input("termId", sql.Int, term.id)
          .input("termType", sql.NVarChar, term.type)
          .input("termTitle", sql.NVarChar, term.title)
          .input("termVersion", sql.NVarChar, term.version)
          .input("agreedYn", sql.Char, agreedYn)
          .input("ip", sql.NVarChar, ip)
          .input("userAgent", sql.NVarChar, userAgent)
          .query(`
            INSERT INTO dbo.MaruPartnerTermAgreements (
              user_uid, term_id, term_scope, term_type, term_title, term_version, agreed_yn, ip, user_agent
            )
            VALUES (@userUid, @termId, 'funeral_member', @termType, @termTitle, @termVersion, @agreedYn, @ip, @userAgent)
          `);
      }

      await transaction.commit();
      return res.status(201).json({ member });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
