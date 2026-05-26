const express = require("express");
const { getPool, hasDatabaseConfig, sql } = require("../db");

const router = express.Router();

router.post("/register", async (req, res, next) => {
  const { username, password, name, phone, email, agreedTerms, agreedPrivacy } = req.body;

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

    const result = await pool
      .request()
      .input("username", sql.NVarChar, username)
      .input("password", sql.NVarChar, password)
      .input("name", sql.NVarChar, name)
      .input("phone", sql.NVarChar, phone)
      .input("email", sql.NVarChar, email || null)
      .input("termsYn", sql.Char, agreedTerms ? "Y" : "N")
      .input("privacyYn", sql.Char, agreedPrivacy ? "Y" : "N")
      .query(`
        INSERT INTO dbo.MaruPartnerUsers (
          uid, username, password, name, phone, email, role, parent_uid, status,
          terms_yn, privacy_yn, signup_source
        )
        OUTPUT INSERTED.id, INSERTED.uid, INSERTED.username, INSERTED.name, INSERTED.phone,
               INSERTED.email, INSERTED.role, INSERTED.parent_uid AS parentUid, INSERTED.status
        VALUES (
          CONCAT('sales_', FORMAT(NEXT VALUE FOR dbo.MaruPartnerSalesUidSeq, '000')),
          @username, @password, @name, @phone, @email, 'sales', 'admin', 'active',
          @termsYn, @privacyYn, 'sales_register'
        )
      `);

    return res.status(201).json({ sales: result.recordset[0] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
