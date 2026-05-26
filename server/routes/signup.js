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
        signup: {
          id: Date.now(),
          uid: `customer_${Date.now()}`,
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
      .query(`
        INSERT INTO dbo.MaruPartnerUsers (uid, username, name, phone, email, role, parent_uid, status)
        OUTPUT INSERTED.id, INSERTED.uid, INSERTED.parent_uid AS parentUid, INSERTED.name, INSERTED.phone, INSERTED.email, INSERTED.status
        VALUES (CONCAT('customer_', NEXT VALUE FOR dbo.MaruPartnerCustomerUidSeq), @phone, @name, @phone, @email, 'customer', @refUid, 'pending')
      `);

    return res.status(201).json({ signup: result.recordset[0] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
