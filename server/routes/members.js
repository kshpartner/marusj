const express = require("express");
const { getPool, hasDatabaseConfig, sql } = require("../db");

const router = express.Router();

const demoMembers = [
  { id: 1, uid: "admin", name: "관리자", role: "admin", parentUid: null, status: "active" },
  { id: 2, uid: "sales_001", name: "김파트너", role: "sales", parentUid: "admin", status: "active" },
  { id: 3, uid: "customer_1001", name: "이고객", role: "customer", parentUid: "sales_001", status: "joined" },
  { id: 4, uid: "customer_1002", name: "박고객", role: "customer", parentUid: "sales_001", status: "pending" },
];

router.get("/", async (req, res, next) => {
  try {
    if (!hasDatabaseConfig()) {
      return res.json({ members: demoMembers });
    }

    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT id, uid, name, role, parent_uid AS parentUid, status
      FROM dbo.MaruPartnerUsers
      ORDER BY id ASC
    `);

    return res.json({ members: result.recordset });
  } catch (error) {
    next(error);
  }
});

router.get("/tree", async (req, res, next) => {
  try {
    if (!hasDatabaseConfig()) {
      return res.json({ members: demoMembers });
    }

    const rootUid = req.query.rootUid || "admin";
    const pool = await getPool();
    const result = await pool
      .request()
      .input("rootUid", sql.NVarChar, rootUid)
      .query(`
        WITH UserTree AS (
          SELECT id, uid, name, role, parent_uid AS parentUid, status, 0 AS depth
          FROM dbo.MaruPartnerUsers
          WHERE uid = @rootUid

          UNION ALL

          SELECT child.id, child.uid, child.name, child.role, child.parent_uid AS parentUid, child.status, parent.depth + 1
          FROM dbo.MaruPartnerUsers child
          INNER JOIN UserTree parent ON child.parent_uid = parent.uid
        )
        SELECT id, uid, name, role, parentUid, status, depth
        FROM UserTree
        ORDER BY depth ASC, id ASC
      `);

    return res.json({ members: result.recordset });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
