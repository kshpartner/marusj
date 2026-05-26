const express = require("express");
const { getPool, hasDatabaseConfig, sql } = require("../db");

const router = express.Router();

const allowedScopes = ["sales_register", "funeral_member"];
const allowedTypes = ["service_terms", "privacy_policy", "marketing_consent"];

function getDefaultTerms(scope = "funeral_member") {
  const isSales = scope === "sales_register";

  return [
    {
      id: isSales ? 1 : 4,
      scope,
      type: "service_terms",
      title: isSales ? "영업사원 회원가입 이용약관" : "상조 회원 가입 약관",
      version: "1.0",
      content: isSales
        ? "영업사원 계정 생성, admin 하위 등록, 가입 링크 발급 및 고객 관리에 관한 기본 약관입니다."
        : "상조 회원 가입 신청, 가입 경로 연결, 상담 및 신청 처리에 관한 기본 약관입니다.",
      requiredYn: "Y",
      activeYn: "Y",
    },
    {
      id: isSales ? 2 : 5,
      scope,
      type: "privacy_policy",
      title: "개인정보 수집 및 이용 동의",
      version: "1.0",
      content: isSales
        ? "영업사원 회원가입, 계정 관리, 본인 확인, 활동 관리 및 정산 안내를 위해 개인정보를 수집 및 이용합니다."
        : "상조 가입 상담, 신청 접수, 본인 확인, 고객 관리 및 가입 경로 확인을 위해 개인정보를 수집 및 이용합니다.",
      requiredYn: "Y",
      activeYn: "Y",
    },
    {
      id: isSales ? 3 : 6,
      scope,
      type: "marketing_consent",
      title: "마케팅 수신 동의",
      version: "1.0",
      content: isSales
        ? "파트너 공지, 프로모션, 교육 및 혜택 안내를 위한 선택 동의입니다."
        : "상조 상품 안내, 이벤트, 혜택 및 상담 후속 안내를 위한 선택 동의입니다.",
      requiredYn: "N",
      activeYn: "Y",
    },
  ];
}

function scopeOrDefault(value) {
  return allowedScopes.includes(value) ? value : "funeral_member";
}

router.get("/", async (req, res, next) => {
  const scope = scopeOrDefault(req.query.scope);

  try {
    if (!hasDatabaseConfig()) {
      return res.json({ terms: getDefaultTerms(scope) });
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input("scope", sql.NVarChar, scope)
      .query(`
        WITH RankedTerms AS (
          SELECT id, scope, type, title, version, content,
                 required_yn AS requiredYn,
                 active_yn AS activeYn,
                 created_at AS createdAt,
                 updated_at AS updatedAt,
                 ROW_NUMBER() OVER (
                   PARTITION BY scope, type
                   ORDER BY CASE WHEN active_yn = 'Y' THEN 0 ELSE 1 END, updated_at DESC, id DESC
                 ) AS rn
          FROM dbo.MaruPartnerTerms
          WHERE scope = @scope
            AND type IN ('service_terms', 'privacy_policy', 'marketing_consent')
        )
        SELECT id, scope, type, title, version, content, requiredYn, activeYn, createdAt, updatedAt
        FROM RankedTerms
        WHERE rn = 1
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

router.get("/active", async (req, res, next) => {
  const scope = scopeOrDefault(req.query.scope);

  try {
    if (!hasDatabaseConfig()) {
      return res.json({ terms: getDefaultTerms(scope) });
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input("scope", sql.NVarChar, scope)
      .query(`
        SELECT id, scope, type, title, version, content,
               required_yn AS requiredYn,
               active_yn AS activeYn
        FROM dbo.MaruPartnerTerms
        WHERE scope = @scope
          AND active_yn = 'Y'
          AND type IN ('service_terms', 'privacy_policy', 'marketing_consent')
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

router.put("/:scope/:type", async (req, res, next) => {
  const { scope, type } = req.params;
  const { title, version, content, requiredYn = "Y" } = req.body;

  if (!allowedScopes.includes(scope) || !allowedTypes.includes(type)) {
    return res.status(400).json({ message: "지원하지 않는 약관 구분입니다." });
  }

  if (!title || !version || !content) {
    return res.status(400).json({ message: "제목, 버전, 내용이 필요합니다." });
  }

  try {
    if (!hasDatabaseConfig()) {
      return res.json({
        term: { id: Date.now(), scope, type, title, version, content, requiredYn, activeYn: "Y" },
      });
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await new sql.Request(transaction)
        .input("scope", sql.NVarChar, scope)
        .input("type", sql.NVarChar, type)
        .query(`
          UPDATE dbo.MaruPartnerTerms
          SET active_yn = 'N', updated_at = SYSUTCDATETIME()
          WHERE scope = @scope AND type = @type
        `);

      const current = await new sql.Request(transaction)
        .input("scope", sql.NVarChar, scope)
        .input("type", sql.NVarChar, type)
        .query(`
          SELECT TOP 1 id
          FROM dbo.MaruPartnerTerms
          WHERE scope = @scope AND type = @type
          ORDER BY id ASC
        `);

      let result;
      if (current.recordset[0]) {
        result = await new sql.Request(transaction)
          .input("id", sql.Int, current.recordset[0].id)
          .input("title", sql.NVarChar, title)
          .input("version", sql.NVarChar, version)
          .input("content", sql.NVarChar, content)
          .input("requiredYn", sql.Char, requiredYn === "Y" ? "Y" : "N")
          .query(`
            UPDATE dbo.MaruPartnerTerms
            SET title = @title,
                version = @version,
                content = @content,
                required_yn = @requiredYn,
                active_yn = 'Y',
                updated_at = SYSUTCDATETIME()
            OUTPUT INSERTED.id, INSERTED.scope, INSERTED.type, INSERTED.title, INSERTED.version,
                   INSERTED.content, INSERTED.required_yn AS requiredYn, INSERTED.active_yn AS activeYn
            WHERE id = @id
          `);
      } else {
        result = await new sql.Request(transaction)
          .input("scope", sql.NVarChar, scope)
          .input("type", sql.NVarChar, type)
          .input("title", sql.NVarChar, title)
          .input("version", sql.NVarChar, version)
          .input("content", sql.NVarChar, content)
          .input("requiredYn", sql.Char, requiredYn === "Y" ? "Y" : "N")
          .query(`
            INSERT INTO dbo.MaruPartnerTerms (scope, type, title, version, content, required_yn, active_yn)
            OUTPUT INSERTED.id, INSERTED.scope, INSERTED.type, INSERTED.title, INSERTED.version,
                   INSERTED.content, INSERTED.required_yn AS requiredYn, INSERTED.active_yn AS activeYn
            VALUES (@scope, @type, @title, @version, @content, @requiredYn, 'Y')
          `);
      }

      await transaction.commit();
      return res.json({ term: result.recordset[0] });
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
      SELECT TOP 100 id, user_uid AS userUid, term_scope AS termScope, term_type AS termType,
             term_title AS termTitle, term_version AS termVersion, agreed_yn AS agreedYn,
             agreed_at AS agreedAt, ip
      FROM dbo.MaruPartnerTermAgreements
      ORDER BY agreed_at DESC, id DESC
    `);

    return res.json({ agreements: result.recordset });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
