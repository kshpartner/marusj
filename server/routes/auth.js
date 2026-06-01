const express = require("express");
const { getPool, hasDatabaseConfig, sql } = require("../db");

const router = express.Router();

router.post("/login", async (req, res, next) => {
  const { username, password } = req.body;

  try {
    if (hasDatabaseConfig()) {
      const pool = await getPool();
      const result = await pool
        .request()
        .input("username", sql.NVarChar, username)
        .input("password", sql.NVarChar, password)
        .query(`
          SELECT TOP 1 id, uid, username, name, role
          FROM dbo.MaruPartnerUsers
          WHERE username = @username
            AND password = @password
            AND status = 'active'
        `);

      const user = result.recordset[0];
      if (!user) {
        return res.status(401).json({ message: "아이디 또는 비밀번호가 올바르지 않습니다." });
      }

      return res.json({ user });
    }

    const adminUsername = process.env.ADMIN_USERNAME || "admin";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin1234";
    const isAdminLogin = username === adminUsername && password === adminPassword;

    if (!isAdminLogin) {
      return res.status(401).json({ message: "아이디 또는 비밀번호가 올바르지 않습니다." });
    }

    return res.json({
      user: {
        id: 1,
        uid: "admin",
        username: "admin",
        name: "관리자",
        role: "admin",
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
