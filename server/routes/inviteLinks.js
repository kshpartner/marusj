const express = require("express");
const { getPool, hasDatabaseConfig, sql } = require("../db");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    if (!hasDatabaseConfig()) {
      return res.json({
        links: [
          { id: 1, name: "admin 직속 상조 약관 링크", refUid: "admin", clicks: 0, signups: 0, status: "active" },
          { id: 2, name: "영업사원 상조 약관 링크", refUid: "sales_001", clicks: 0, signups: 0, status: "active" },
        ],
      });
    }

    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT id, name, ref_uid AS refUid, clicks, signups, status
      FROM dbo.MaruPartnerInviteLinks
      ORDER BY id DESC
    `);

    return res.json({ links: result.recordset });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  const { name = "상조 약관 링크", refUid } = req.body;

  if (!refUid) {
    return res.status(400).json({ message: "상위 UID가 필요합니다." });
  }

  try {
    if (!hasDatabaseConfig()) {
      return res.status(201).json({
        link: { id: Date.now(), name, refUid, clicks: 0, signups: 0, status: "active" },
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
      return res.status(400).json({ message: "상조 약관 링크는 admin 또는 영업사원 UID로만 만들 수 있습니다." });
    }

    const result = await pool
      .request()
      .input("name", sql.NVarChar, name)
      .input("refUid", sql.NVarChar, refUid)
      .query(`
        INSERT INTO dbo.MaruPartnerInviteLinks (name, ref_uid, clicks, signups, status)
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.ref_uid AS refUid, INSERTED.clicks, INSERTED.signups, INSERTED.status
        VALUES (@name, @refUid, 0, 0, 'active')
      `);

    return res.status(201).json({ link: result.recordset[0] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
