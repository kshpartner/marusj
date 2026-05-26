require("dotenv").config();

const sql = require("mssql");

const terms = [
  {
    type: "service_terms",
    title: "상조 서비스 이용약관",
    version: "1.0",
    requiredYn: "Y",
    content: `제1조 목적
본 약관은 마루 파트너 관리 시스템을 통해 상조 서비스 가입 상담 및 신청을 진행하는 고객과 관리자, 영업사원 간의 기본적인 이용 조건과 절차를 정합니다.

제2조 가입 신청
고객은 admin 또는 영업사원이 제공한 상조 가입 링크를 통해 본인 정보를 입력하고 필수 약관에 동의한 뒤 가입 신청을 할 수 있습니다. 가입 신청은 상담 및 확인 절차를 거쳐 최종 처리됩니다.

제3조 영업사원 연결
가입 링크에 포함된 상위 UID를 기준으로 고객은 admin 또는 해당 영업사원 하위 상조 회원으로 등록됩니다. 이 정보는 가입 경로 확인, 고객 관리, 커미션 산정의 기초 자료로 활용될 수 있습니다.

제4조 정보의 정확성
고객은 가입 신청 시 정확한 정보를 제공해야 하며, 잘못된 정보로 인해 상담, 안내, 서비스 제공이 지연되거나 제한될 수 있습니다.

제5조 신청 변경 및 철회
고객은 가입 상담 또는 처리 과정에서 신청 내용의 변경이나 철회를 요청할 수 있습니다. 이미 별도 계약이 체결된 경우에는 해당 계약서와 관련 법령이 우선 적용됩니다.`,
  },
  {
    type: "privacy_policy",
    title: "개인정보 수집 및 이용 동의",
    version: "1.0",
    requiredYn: "Y",
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

5. 파기 및 문의
보유 기간이 종료되거나 처리 목적이 달성된 개인정보는 지체 없이 파기합니다. 개인정보 관련 문의는 서비스 운영자 또는 개인정보 보호 담당자에게 요청할 수 있습니다.`,
  },
  {
    type: "marketing_consent",
    title: "마케팅 수신 동의",
    version: "1.0",
    requiredYn: "N",
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
  },
];

async function main() {
  const pool = await sql.connect({
    server: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 1433),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
      encrypt: process.env.DB_ENCRYPT !== "false",
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true",
    },
  });

  for (const term of terms) {
    const current = await pool
      .request()
      .input("type", sql.NVarChar, term.type)
      .query(`
        SELECT TOP 1 id
        FROM dbo.MaruPartnerTerms
        WHERE type = @type
        ORDER BY CASE WHEN active_yn = 'Y' THEN 0 ELSE 1 END, id ASC
      `);

    let keepId = current.recordset[0]?.id;
    if (!keepId) {
      const inserted = await pool
        .request()
        .input("type", sql.NVarChar, term.type)
        .input("title", sql.NVarChar, term.title)
        .input("version", sql.NVarChar, term.version)
        .input("content", sql.NVarChar, term.content)
        .input("requiredYn", sql.Char, term.requiredYn)
        .query(`
          INSERT INTO dbo.MaruPartnerTerms (type, title, version, content, required_yn, active_yn)
          OUTPUT INSERTED.id
          VALUES (@type, @title, @version, @content, @requiredYn, 'Y')
        `);
      keepId = inserted.recordset[0].id;
    }

    await pool
      .request()
      .input("id", sql.Int, keepId)
      .input("title", sql.NVarChar, term.title)
      .input("version", sql.NVarChar, term.version)
      .input("content", sql.NVarChar, term.content)
      .input("requiredYn", sql.Char, term.requiredYn)
      .query(`
        UPDATE dbo.MaruPartnerTerms
        SET title = @title,
            version = @version,
            content = @content,
            required_yn = @requiredYn,
            active_yn = 'Y',
            updated_at = SYSUTCDATETIME()
        WHERE id = @id
      `);

    await pool
      .request()
      .input("type", sql.NVarChar, term.type)
      .input("id", sql.Int, keepId)
      .query("DELETE FROM dbo.MaruPartnerTerms WHERE type = @type AND id <> @id");
  }

  const result = await pool.request().query(`
    SELECT type, title, version, required_yn AS requiredYn, active_yn AS activeYn
    FROM dbo.MaruPartnerTerms
    ORDER BY CASE type
      WHEN 'service_terms' THEN 1
      WHEN 'privacy_policy' THEN 2
      WHEN 'marketing_consent' THEN 3
      ELSE 9
    END
  `);

  console.log(JSON.stringify(result.recordset, null, 2));
  await pool.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
