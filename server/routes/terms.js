const express = require("express");
const { getPool, hasDatabaseConfig, sql } = require("../db");

const router = express.Router();

const demoTerms = [
  {
    id: 1,
    type: "service_terms",
    title: "상조 서비스 이용약관",
    version: "1.0",
    content: "상조 서비스 이용과 관련한 기본 약관 내용을 입력해주세요.",
    requiredYn: "Y",
    activeYn: "Y",
  },
  {
    id: 2,
    type: "privacy_policy",
    title: "개인정보 수집 및 이용 동의",
    version: "1.0",
    content: "수집 항목, 이용 목적, 보유 기간 등 개인정보 처리 내용을 입력해주세요.",
    requiredYn: "Y",
    activeYn: "Y",
  },
  {
    id: 3,
    type: "marketing_consent",
    title: "마케팅 수신 동의",
    version: "1.0",
    content: "이벤트, 혜택, 안내 메시지 수신 동의 내용을 입력해주세요.",
    requiredYn: "N",
    activeYn: "Y",
  },
];

router.get("/", async (req, res, next) => {
  try {
    if (!hasDatabaseConfig()) {
      return res.json({ terms: demoTerms });
    }

    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT id, type, title, version, content,
             required_yn AS requiredYn,
             active_yn AS activeYn,
             created_at AS createdAt,
             updated_at AS updatedAt
      FROM dbo.MaruPartnerTerms
      ORDER BY type ASC, created_at DESC, id DESC
    `);

    return res.json({ terms: result.recordset });
  } catch (error) {
    next(error);
  }
});

router.get("/active", async (req, res, next) => {
  try {
    if (!hasDatabaseConfig()) {
      return res.json({ terms: demoTerms.filter((term) => term.activeYn === "Y") });
    }

    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT id, type, title, version, content,
             required_yn AS requiredYn,
             active_yn AS activeYn
      FROM dbo.MaruPartnerTerms
      WHERE active_yn = 'Y'
      ORDER BY CASE type
        WHEN 'service_terms' THEN 1
        WHEN 'privacy_policy' THEN 2
        WHEN 'marketing_consent' THEN 3
        ELSE 9
      END
    `);

    return res.json({ terms: result.recordset });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  const { type, title, version, content, requiredYn = "Y", activeYn = "N" } = req.body;

  if (!type || !title || !version || !content) {
    return res.status(400).json({ message: "약관 종류, 제목, 버전, 내용이 필요합니다." });
  }

  try {
    if (!hasDatabaseConfig()) {
      return res.status(201).json({
        term: { id: Date.now(), type, title, version, content, requiredYn, activeYn },
      });
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      if (activeYn === "Y") {
        await new sql.Request(transaction)
          .input("type", sql.NVarChar, type)
          .query("UPDATE dbo.MaruPartnerTerms SET active_yn = 'N', updated_at = SYSUTCDATETIME() WHERE type = @type");
      }

      const result = await new sql.Request(transaction)
        .input("type", sql.NVarChar, type)
        .input("title", sql.NVarChar, title)
        .input("version", sql.NVarChar, version)
        .input("content", sql.NVarChar, content)
        .input("requiredYn", sql.Char, requiredYn === "Y" ? "Y" : "N")
        .input("activeYn", sql.Char, activeYn === "Y" ? "Y" : "N")
        .query(`
          INSERT INTO dbo.MaruPartnerTerms (type, title, version, content, required_yn, active_yn)
          OUTPUT INSERTED.id, INSERTED.type, INSERTED.title, INSERTED.version, INSERTED.content,
                 INSERTED.required_yn AS requiredYn, INSERTED.active_yn AS activeYn
          VALUES (@type, @title, @version, @content, @requiredYn, @activeYn)
        `);

      await transaction.commit();
      return res.status(201).json({ term: result.recordset[0] });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/activate", async (req, res, next) => {
  try {
    if (!hasDatabaseConfig()) {
      return res.json({ ok: true });
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const current = await new sql.Request(transaction)
        .input("id", sql.Int, Number(req.params.id))
        .query("SELECT TOP 1 id, type FROM dbo.MaruPartnerTerms WHERE id = @id");

      const term = current.recordset[0];
      if (!term) {
        await transaction.rollback();
        return res.status(404).json({ message: "약관을 찾을 수 없습니다." });
      }

      await new sql.Request(transaction)
        .input("type", sql.NVarChar, term.type)
        .query("UPDATE dbo.MaruPartnerTerms SET active_yn = 'N', updated_at = SYSUTCDATETIME() WHERE type = @type");

      await new sql.Request(transaction)
        .input("id", sql.Int, term.id)
        .query("UPDATE dbo.MaruPartnerTerms SET active_yn = 'Y', updated_at = SYSUTCDATETIME() WHERE id = @id");

      await transaction.commit();
      return res.json({ ok: true });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

router.get("/agreements", async (req, res, next) => {
  try {
    if (!hasDatabaseConfig()) {
      return res.json({ agreements: [] });
    }

    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT TOP 100 id, user_uid AS userUid, term_type AS termType, term_title AS termTitle,
             term_version AS termVersion, agreed_yn AS agreedYn, agreed_at AS agreedAt, ip
      FROM dbo.MaruPartnerTermAgreements
      ORDER BY agreed_at DESC, id DESC
    `);

    return res.json({ agreements: result.recordset });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
