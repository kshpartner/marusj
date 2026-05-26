const express = require("express");
const { getPool, hasDatabaseConfig, sql } = require("../db");

const router = express.Router();

router.post("/register", async (req, res, next) => {
  const { username, password, name, phone, email, agreedTerms, agreedPrivacy, agreedMarketing = false } = req.body;

  if (!username || !password || !name || !phone || !agreedTerms || !agreedPrivacy) {
    return res.status(400).json({ message: "필수 가입 정보를 확인해주세요." });
  }

  try {
    if (!hasDatabaseConfig()) {
      return res.status(201).json({
        sales: {
          id: Date.now(),
          uid: `sales_${Date.now()}`,
          username,
          name,
          phone,
          email,
          role: "sales",
          parentUid: "admin",
          status: "active",
        },
      });
    }

    const pool = await getPool();
    const duplicate = await pool
      .request()
      .input("username", sql.NVarChar, username)
      .query(`
        SELECT TOP 1 id
        FROM dbo.MaruPartnerUsers
        WHERE username = @username
      `);

    if (duplicate.recordset[0]) {
      return res.status(409).json({ message: "이미 사용 중인 아이디입니다." });
    }

    const activeTerms = await pool.request().query(`
      SELECT id, type, title, version, required_yn AS requiredYn
      FROM dbo.MaruPartnerTerms
      WHERE scope = 'sales_register'
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
      .input("username", sql.NVarChar, username)
      .input("password", sql.NVarChar, password)
      .input("name", sql.NVarChar, name)
      .input("phone", sql.NVarChar, phone)
      .input("email", sql.NVarChar, email || null)
      .input("termsYn", sql.Char, agreedTerms ? "Y" : "N")
      .input("privacyYn", sql.Char, agreedPrivacy ? "Y" : "N")
      .input("marketingYn", sql.Char, agreedMarketing ? "Y" : "N")
      .query(`
        INSERT INTO dbo.MaruPartnerUsers (
          uid, username, password, name, phone, email, role, parent_uid, status,
          terms_yn, privacy_yn, marketing_yn, signup_source
        )
        OUTPUT INSERTED.id, INSERTED.uid, INSERTED.username, INSERTED.name, INSERTED.phone,
               INSERTED.email, INSERTED.role, INSERTED.parent_uid AS parentUid, INSERTED.status
        VALUES (
          CONCAT('sales_', FORMAT(NEXT VALUE FOR dbo.MaruPartnerSalesUidSeq, '000')),
          @username, @password, @name, @phone, @email, 'sales', 'admin', 'active',
          @termsYn, @privacyYn, @marketingYn, 'sales_register'
        )
      `);

      const sales = result.recordset[0];
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
          .input("userUid", sql.NVarChar, sales.uid)
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
            VALUES (@userUid, @termId, 'sales_register', @termType, @termTitle, @termVersion, @agreedYn, @ip, @userAgent)
          `);
      }

      await transaction.commit();
      return res.status(201).json({ sales });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
