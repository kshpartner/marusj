const express = require("express");
const { getPool, hasDatabaseConfig, sql } = require("../db");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    if (!hasDatabaseConfig()) {
      return res.json({
        links: [
          { id: 1, name: "기본 가입 링크", refUid: "sales_001", clicks: 248, signups: 31, status: "active" },
          { id: 2, name: "5월 캠페인", refUid: "sales_003", clicks: 91, signups: 12, status: "active" },
        ],
      });
    }

    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT id, name, ref_uid AS refUid, clicks, signups, status
      FROM dbo.InviteLinks
      ORDER BY id DESC
    `);

    return res.json({ links: result.recordset });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  const { name = "가입 링크", refUid } = req.body;

  if (!refUid) {
    return res.status(400).json({ message: "추천인 UID가 필요합니다." });
  }

  try {
    if (!hasDatabaseConfig()) {
      return res.status(201).json({
        link: { id: Date.now(), name, refUid, clicks: 0, signups: 0, status: "active" },
      });
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input("name", sql.NVarChar, name)
      .input("refUid", sql.NVarChar, refUid)
      .query(`
        INSERT INTO dbo.InviteLinks (name, ref_uid, clicks, signups, status)
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.ref_uid AS refUid, INSERTED.clicks, INSERTED.signups, INSERTED.status
        VALUES (@name, @refUid, 0, 0, 'active')
      `);

    return res.status(201).json({ link: result.recordset[0] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
