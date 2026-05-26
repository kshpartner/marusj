const express = require("express");
const { getPool, hasDatabaseConfig, sql } = require("../db");

const router = express.Router();

const defaultTerms = [
  {
    id: 1,
    type: "service_terms",
    title: "상조 서비스 이용약관",
    version: "1.0",
    content: `제1조 목적
본 약관은 마루 파트너 관리 시스템을 통해 상조 서비스 가입 상담 및 신청을 진행하는 고객과 관리자, 영업사원 간의 기본적인 이용 조건과 절차를 정합니다.

제2조 가입 신청
고객은 admin 또는 영업사원이 제공한 상조 가입 링크를 통해 본인 정보를 입력하고 필수 약관에 동의한 뒤 가입 신청을 할 수 있습니다. 가입 신청은 상담 및 확인 절차를 거쳐 최종 처리됩니다.

제3조 영업사원 연결
가입 링크에 포함된 상위 UID를 기준으로 고객은 admin 또는 해당 영업사원 하위 상조 회원으로 등록됩니다. 이 정보는 가입 경로 확인, 고객 관리, 커미션 산정의 기초 자료로 활용될 수 있습니다.

제4조 정보의 정확성
고객은 가입 신청 시 정확한 정보를 제공해야 하며, 잘못된 정보로 인해 상담, 안내, 서비스 제공이 지연되거나 제한될 수 있습니다.

제5조 신청 변경 및 철회
고객은 가입 상담 또는 처리 과정에서 신청 내용의 변경이나 철회를 요청할 수 있습니다. 이미 별도 계약이 체결된 경우에는 해당 계약서와 관련 법령이 우선 적용됩니다.

제6조 책임의 제한
본 시스템은 상조 가입 신청과 고객 관리를 위한 접수 및 관리 도구입니다. 구체적인 상품 내용, 납입 조건, 해약 조건 등은 별도 안내서 또는 계약서에서 정한 내용을 따릅니다.

제7조 약관의 변경
관리자는 필요한 경우 약관을 수정할 수 있으며, 변경된 약관은 가입 페이지 또는 관리자 화면을 통해 고지합니다. 변경 후 가입하는 고객에게는 수정된 약관이 적용됩니다.`,
    requiredYn: "Y",
    activeYn: "Y",
  },
  {
    id: 2,
    type: "privacy_policy",
    title: "개인정보 수집 및 이용 동의",
    version: "1.0",
    content: `1. 수집 및 이용 목적
상조 가입 상담, 가입 신청 접수, 본인 확인, 고객 관리, 계약 진행 안내, 민원 응대, 가입 경로 확인, 영업사원별 실적 및 커미션 산정 자료 관리를 위해 개인정보를 수집 및 이용합니다.

2. 수집 항목
필수 항목: 이름, 연락처, 상위 UID, 약관 동의 여부, 가입 신청 일시
선택 항목: 이메일
자동 수집 항목: 접속 IP, 브라우저 정보, 사용자 환경 정보

3. 보유 및 이용 기간
개인정보는 가입 상담 및 고객 관리 목적 달성 시까지 보유 및 이용합니다. 단, 관련 법령에 따른 보관 의무, 분쟁 처리, 정산 확인, 민원 대응이 필요한 경우 해당 기간 동안 보관할 수 있습니다.

4. 동의 거부 권리
정보주체는 개인정보 수집 및 이용에 대한 동의를 거부할 권리가 있습니다. 다만 필수 항목에 대한 동의를 거부할 경우 상조 가입 신청 및 상담 진행이 제한될 수 있습니다.

5. 파기
보유 기간이 종료되거나 처리 목적이 달성된 개인정보는 복구 또는 재생되지 않도록 지체 없이 파기합니다.

6. 문의
개인정보 관련 문의는 서비스 운영자 또는 개인정보 보호 담당자에게 요청할 수 있습니다. 운영자 정보와 담당자 연락처는 실제 운영 정보로 별도 기재해 주세요.`,
    requiredYn: "Y",
    activeYn: "Y",
  },
  {
    id: 3,
    type: "marketing_consent",
    title: "마케팅 수신 동의",
    version: "1.0",
    content: `1. 수집 및 이용 목적
상조 상품 안내, 이벤트 및 혜택 안내, 상담 후속 안내, 신규 서비스 안내 등 마케팅 및 광고성 정보 제공을 위해 개인정보를 이용합니다.

2. 이용 항목
이름, 연락처, 이메일, 가입 경로, 상담 이력

3. 안내 방법
전화, 문자메시지, 카카오 알림톡 또는 친구톡, 이메일 등 고객이 제공한 연락 수단으로 안내할 수 있습니다.

4. 보유 및 이용 기간
마케팅 수신 동의 철회 시 또는 회원 관리 목적 종료 시까지 보유 및 이용합니다.

5. 동의 거부 및 철회
마케팅 수신 동의는 선택 사항이며, 동의하지 않아도 상조 가입 신청에는 제한이 없습니다. 고객은 언제든지 수신 동의를 철회할 수 있습니다.`,
    requiredYn: "N",
    activeYn: "Y",
  },
];

function orderTerms(terms) {
  const order = {
    service_terms: 1,
    privacy_policy: 2,
    marketing_consent: 3,
  };

  return [...terms].sort((a, b) => (order[a.type] || 9) - (order[b.type] || 9));
}

router.get("/", async (req, res, next) => {
  try {
    if (!hasDatabaseConfig()) {
      return res.json({ terms: orderTerms(defaultTerms) });
    }

    const pool = await getPool();
    const result = await pool.request().query(`
      WITH RankedTerms AS (
        SELECT id, type, title, version, content,
               required_yn AS requiredYn,
               active_yn AS activeYn,
               created_at AS createdAt,
               updated_at AS updatedAt,
               ROW_NUMBER() OVER (
                 PARTITION BY type
                 ORDER BY CASE WHEN active_yn = 'Y' THEN 0 ELSE 1 END, updated_at DESC, id DESC
               ) AS rn
        FROM dbo.MaruPartnerTerms
        WHERE type IN ('service_terms', 'privacy_policy', 'marketing_consent')
      )
      SELECT id, type, title, version, content, requiredYn, activeYn, createdAt, updatedAt
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
  try {
    if (!hasDatabaseConfig()) {
      return res.json({ terms: orderTerms(defaultTerms) });
    }

    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT id, type, title, version, content,
             required_yn AS requiredYn,
             active_yn AS activeYn
      FROM dbo.MaruPartnerTerms
      WHERE active_yn = 'Y'
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

router.put("/:type", async (req, res, next) => {
  const { type } = req.params;
  const { title, version, content, requiredYn = "Y" } = req.body;
  const allowedTypes = ["service_terms", "privacy_policy", "marketing_consent"];

  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ message: "지원하지 않는 약관 종류입니다." });
  }

  if (!title || !version || !content) {
    return res.status(400).json({ message: "제목, 버전, 내용이 필요합니다." });
  }

  try {
    if (!hasDatabaseConfig()) {
      return res.json({
        term: { id: Date.now(), type, title, version, content, requiredYn, activeYn: "Y" },
      });
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await new sql.Request(transaction)
        .input("type", sql.NVarChar, type)
        .query("UPDATE dbo.MaruPartnerTerms SET active_yn = 'N', updated_at = SYSUTCDATETIME() WHERE type = @type");

      const current = await new sql.Request(transaction)
        .input("type", sql.NVarChar, type)
        .query(`
          SELECT TOP 1 id
          FROM dbo.MaruPartnerTerms
          WHERE type = @type
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
            OUTPUT INSERTED.id, INSERTED.type, INSERTED.title, INSERTED.version, INSERTED.content,
                   INSERTED.required_yn AS requiredYn, INSERTED.active_yn AS activeYn
            WHERE id = @id
          `);
      } else {
        result = await new sql.Request(transaction)
          .input("type", sql.NVarChar, type)
          .input("title", sql.NVarChar, title)
          .input("version", sql.NVarChar, version)
          .input("content", sql.NVarChar, content)
          .input("requiredYn", sql.Char, requiredYn === "Y" ? "Y" : "N")
          .query(`
            INSERT INTO dbo.MaruPartnerTerms (type, title, version, content, required_yn, active_yn)
            OUTPUT INSERTED.id, INSERTED.type, INSERTED.title, INSERTED.version, INSERTED.content,
                   INSERTED.required_yn AS requiredYn, INSERTED.active_yn AS activeYn
            VALUES (@type, @title, @version, @content, @requiredYn, 'Y')
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
