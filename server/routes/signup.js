const express = require("express");
const { getPool, hasDatabaseConfig, sql } = require("../db");

const router = express.Router();

router.post("/", async (req, res, next) => {
  const { refUid, name, phone, email, agreedTerms, agreedPrivacy } = req.body;

  if (!refUid || !name || !phone || !agreedTerms || !agreedPrivacy) {
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
          email,
          status: "pending",
        },
      });
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input("refUid", sql.NVarChar, refUid)
      .input("name", sql.NVarChar, name)
      .input("phone", sql.NVarChar, phone)
      .input("email", sql.NVarChar, email || null)
      .input("termsYn", sql.Char, agreedTerms ? "Y" : "N")
      .input("privacyYn", sql.Char, agreedPrivacy ? "Y" : "N")
      .query(`
        INSERT INTO dbo.MaruPartnerUsers (
          uid, username, name, phone, email, role, parent_uid, status,
          terms_yn, privacy_yn, signup_source
        )
        OUTPUT INSERTED.id, INSERTED.uid, INSERTED.parent_uid AS parentUid, INSERTED.name, INSERTED.phone, INSERTED.email, INSERTED.status
        VALUES (
          CONCAT('member_', NEXT VALUE FOR dbo.MaruPartnerMemberUidSeq),
          @phone, @name, @phone, @email, 'funeral_member', @refUid, 'pending',
          @termsYn, @privacyYn, 'sales_terms_link'
        )
      `);

    return res.status(201).json({ member: result.recordset[0] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
