const express = require("express");
const { getPool, hasDatabaseConfig, sql } = require("../db");

const router = express.Router();

const demoMembers = [
  { id: 1, uid: "admin", name: "관리자", role: "admin", parentUid: null, status: "active" },
  { id: 2, uid: "center_001", name: "서울센터", role: "center_manager", parentUid: "admin", status: "active" },
  { id: 3, uid: "sales_001", name: "김영업", role: "sales", parentUid: "center_001", status: "active" },
  {
    id: 4,
    uid: "member_1001",
    name: "이고객",
    phone: "01011112222",
    age: 45,
    gender: "male",
    region: "서울 강남구",
    role: "funeral_member",
    parentUid: "sales_001",
    status: "joined",
  },
  {
    id: 5,
    uid: "member_1002",
    name: "박고객",
    phone: "01033334444",
    age: 52,
    gender: "female",
    region: "부산 해운대구",
    role: "funeral_member",
    parentUid: "admin",
    status: "pending",
  },
];

const userSelect = `
  id, uid, username, name, phone, age, gender, region, email, role,
  parent_uid AS parentUid, status
`;

router.get("/", async (req, res, next) => {
  try {
    if (!hasDatabaseConfig()) {
      return res.json({ members: demoMembers });
    }

    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT ${userSelect}
      FROM dbo.MaruPartnerUsers
      ORDER BY id ASC
    `);

    return res.json({ members: result.recordset });
  } catch (error) {
    next(error);
  }
});

router.get("/centers", async (req, res, next) => {
  try {
    if (!hasDatabaseConfig()) {
      return res.json({
        centers: demoMembers.filter((member) => member.role === "center_manager"),
      });
    }

    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT ${userSelect}
      FROM dbo.MaruPartnerUsers
      WHERE role = 'center_manager'
        AND status = 'active'
      ORDER BY name ASC, id ASC
    `);

    return res.json({ centers: result.recordset });
  } catch (error) {
    next(error);
  }
});

router.post("/centers", async (req, res, next) => {
  const { username, password, name, phone, email } = req.body;

  if (!username || !password || !name || !phone) {
    return res.status(400).json({ message: "센터장 등록 정보를 확인해주세요." });
  }

  try {
    if (!hasDatabaseConfig()) {
      return res.status(201).json({
        center: {
          id: Date.now(),
          uid: `center_${Date.now()}`,
          username,
          name,
          phone,
          email,
          role: "center_manager",
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
      .query(`
        INSERT INTO dbo.MaruPartnerUsers (
          uid, username, password, name, phone, email, role, parent_uid, status, signup_source
        )
        OUTPUT INSERTED.id, INSERTED.uid, INSERTED.username, INSERTED.name, INSERTED.phone,
               INSERTED.email, INSERTED.role, INSERTED.parent_uid AS parentUid, INSERTED.status
        VALUES (
          CONCAT('center_', FORMAT(NEXT VALUE FOR dbo.MaruPartnerCenterUidSeq, '000')),
          @username, @password, @name, @phone, @email, 'center_manager', 'admin', 'active', 'admin_create'
        )
      `);

    return res.status(201).json({ center: result.recordset[0] });
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
          SELECT id, uid, username, name, phone, age, gender, region, email, role,
                 parent_uid AS parentUid, status, 0 AS depth
          FROM dbo.MaruPartnerUsers
          WHERE uid = @rootUid

          UNION ALL

          SELECT child.id, child.uid, child.username, child.name, child.phone, child.age,
                 child.gender, child.region, child.email, child.role,
                 child.parent_uid AS parentUid, child.status, parent.depth + 1
          FROM dbo.MaruPartnerUsers child
          INNER JOIN UserTree parent ON child.parent_uid = parent.uid
        )
        SELECT id, uid, username, name, phone, age, gender, region, email, role, parentUid, status, depth
        FROM UserTree
        ORDER BY depth ASC, id ASC
      `);

    return res.json({ members: result.recordset });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
