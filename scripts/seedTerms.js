require("dotenv").config();

const sql = require("mssql");

const terms = [
  {
    scope: "sales_register",
    type: "service_terms",
    title: "팀장 회원가입 이용약관",
    version: "1.0",
    requiredYn: "Y",
    content: `제1조 목적
본 약관은 마루 파트너 관리 시스템의 팀장 계정 가입, 이용, 고객 관리 활동에 필요한 기본 조건과 절차를 정합니다.

제2조 계정 가입
팀장은 본인 정보를 입력하고 필수 약관에 동의한 뒤 회원가입을 신청할 수 있습니다. 가입된 팀장 계정은 admin 하위로 등록됩니다.

제3조 가입 링크 및 고객 관리
팀장은 본인의 UID가 포함된 상조 가입 링크를 생성하여 고객에게 전달할 수 있습니다. 해당 링크를 통해 가입한 상조 회원은 팀장의 하위 회원으로 연결됩니다.

제4조 준수 사항
팀장은 고객에게 정확한 정보를 안내해야 하며, 허위 또는 과장 안내, 부정 가입 유도, 개인정보의 무단 이용을 해서는 안 됩니다.

제5조 계정 제한
운영자는 약관 위반, 부정 이용, 고객 민원 등 필요한 사유가 있는 경우 팀장 계정 이용을 제한하거나 비활성화할 수 있습니다.`,
  },
  {
    scope: "sales_register",
    type: "privacy_policy",
    title: "팀장 개인정보 수집 및 이용 동의",
    version: "1.0",
    requiredYn: "Y",
    content: `1. 수집 및 이용 목적
팀장 회원가입, 본인 확인, 계정 관리, 고객 배정 및 관리, 활동 이력 확인, 커미션 및 정산 안내, 민원 대응을 위해 개인정보를 수집 및 이용합니다.

2. 수집 항목
필수 항목: 아이디, 비밀번호, 이름, 연락처, 약관 동의 여부, 가입 일시
선택 항목: 이메일
자동 수집 항목: 접속 IP, 브라우저 정보, 사용자 환경 정보

3. 보유 및 이용 기간
팀장 계정 유지 및 관련 업무 처리 목적 달성 시까지 보유합니다. 단, 정산 확인, 분쟁 처리, 법령상 의무 이행이 필요한 경우 해당 기간 동안 보관할 수 있습니다.

4. 동의 거부 권리
필수 개인정보 수집 및 이용에 대한 동의를 거부할 수 있으나, 이 경우 팀장 회원가입 및 계정 이용이 제한될 수 있습니다.`,
  },
  {
    scope: "sales_register",
    type: "marketing_consent",
    title: "팀장 마케팅 수신 동의",
    version: "1.0",
    requiredYn: "N",
    content: `1. 이용 목적
파트너 공지, 교육 안내, 프로모션, 혜택, 신규 기능 및 영업 활동 지원 정보를 제공하기 위해 개인정보를 이용합니다.

2. 이용 항목
이름, 연락처, 이메일, 팀장 UID, 활동 이력

3. 안내 방법
전화, 문자메시지, 카카오 알림톡 또는 친구톡, 이메일 등으로 안내할 수 있습니다.

4. 동의 거부 및 철회
마케팅 수신 동의는 선택 사항이며, 동의하지 않아도 회원가입에는 제한이 없습니다. 언제든지 수신 동의를 철회할 수 있습니다.`,
  },
  {
    scope: "funeral_member",
    type: "service_terms",
    title: "상조 회원 가입 약관",
    version: "1.0",
    requiredYn: "Y",
    content: `제1조 목적
본 약관은 마루 파트너 관리 시스템을 통해 상조 서비스 가입 상담 및 신청을 진행하는 고객과 관리자, 팀장 간의 기본적인 이용 조건과 절차를 정합니다.

제2조 가입 신청
고객은 admin 또는 팀장이 제공한 상조 가입 링크를 통해 본인 정보를 입력하고 필수 약관에 동의한 뒤 가입 신청을 할 수 있습니다. 가입 신청은 상담 및 확인 절차를 거쳐 최종 처리됩니다.

제3조 가입 경로 연결
가입 링크에 포함된 상위 UID를 기준으로 고객은 admin 또는 해당 팀장 하위 상조 회원으로 등록됩니다. 이 정보는 가입 경로 확인, 고객 관리, 커미션 산정의 기초 자료로 활용될 수 있습니다.

제4조 정보의 정확성
고객은 가입 신청 시 정확한 정보를 제공해야 하며, 잘못된 정보로 인해 상담, 안내, 서비스 제공이 지연되거나 제한될 수 있습니다.

제5조 신청 변경 및 철회
고객은 가입 상담 또는 처리 과정에서 신청 내용의 변경이나 철회를 요청할 수 있습니다. 이미 별도 계약이 체결된 경우에는 해당 계약서와 관련 법령이 우선 적용됩니다.`,
  },
  {
    scope: "funeral_member",
    type: "privacy_policy",
    title: "상조 회원 개인정보 수집 및 이용 동의",
    version: "1.0",
    requiredYn: "Y",
    content: `1. 수집 및 이용 목적
상조 가입 상담, 가입 신청 접수, 본인 확인, 고객 관리, 계약 진행 안내, 민원 응대, 가입 경로 확인, 팀장별 실적 및 커미션 산정 자료 관리를 위해 개인정보를 수집 및 이용합니다.

2. 수집 항목
필수 항목: 이름, 연락처, 상위 UID, 약관 동의 여부, 가입 신청 일시
선택 항목: 이메일
자동 수집 항목: 접속 IP, 브라우저 정보, 사용자 환경 정보

3. 보유 및 이용 기간
개인정보는 가입 상담 및 고객 관리 목적 달성 시까지 보유 및 이용합니다. 단, 관련 법령에 따른 보관 의무, 분쟁 처리, 정산 확인, 민원 대응이 필요한 경우 해당 기간 동안 보관할 수 있습니다.

4. 동의 거부 권리
정보주체는 개인정보 수집 및 이용에 대한 동의를 거부할 권리가 있습니다. 다만 필수 항목에 대한 동의를 거부할 경우 상조 가입 신청 및 상담 진행이 제한될 수 있습니다.`,
  },
  {
    scope: "funeral_member",
    type: "marketing_consent",
    title: "상조 회원 마케팅 수신 동의",
    version: "1.0",
    requiredYn: "N",
    content: `1. 이용 목적
상조 상품 안내, 이벤트 및 혜택 안내, 상담 후속 안내, 신규 서비스 안내 등 마케팅 및 광고성 정보 제공을 위해 개인정보를 이용합니다.

2. 이용 항목
이름, 연락처, 이메일, 가입 경로, 상담 이력

3. 안내 방법
전화, 문자메시지, 카카오 알림톡 또는 친구톡, 이메일 등 고객이 제공한 연락 수단으로 안내할 수 있습니다.

4. 동의 거부 및 철회
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

  await pool.request().query(`
    IF COL_LENGTH('dbo.MaruPartnerTerms', 'scope') IS NULL
      ALTER TABLE dbo.MaruPartnerTerms ADD scope NVARCHAR(50) NOT NULL DEFAULT 'funeral_member';
    IF COL_LENGTH('dbo.MaruPartnerTermAgreements', 'term_scope') IS NULL
      ALTER TABLE dbo.MaruPartnerTermAgreements ADD term_scope NVARCHAR(50) NOT NULL DEFAULT 'funeral_member';
  `);

  for (const term of terms) {
    const current = await pool
      .request()
      .input("scope", sql.NVarChar, term.scope)
      .input("type", sql.NVarChar, term.type)
      .query(`
        SELECT TOP 1 id
        FROM dbo.MaruPartnerTerms
        WHERE scope = @scope AND type = @type
        ORDER BY CASE WHEN active_yn = 'Y' THEN 0 ELSE 1 END, id ASC
      `);

    let keepId = current.recordset[0]?.id;
    if (!keepId) {
      const inserted = await pool
        .request()
        .input("scope", sql.NVarChar, term.scope)
        .input("type", sql.NVarChar, term.type)
        .input("title", sql.NVarChar, term.title)
        .input("version", sql.NVarChar, term.version)
        .input("content", sql.NVarChar, term.content)
        .input("requiredYn", sql.Char, term.requiredYn)
        .query(`
          INSERT INTO dbo.MaruPartnerTerms (scope, type, title, version, content, required_yn, active_yn)
          OUTPUT INSERTED.id
          VALUES (@scope, @type, @title, @version, @content, @requiredYn, 'Y')
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
      .input("scope", sql.NVarChar, term.scope)
      .input("type", sql.NVarChar, term.type)
      .input("id", sql.Int, keepId)
      .query("DELETE FROM dbo.MaruPartnerTerms WHERE scope = @scope AND type = @type AND id <> @id");
  }

  const result = await pool.request().query(`
    SELECT scope, type, title, version, required_yn AS requiredYn, active_yn AS activeYn
    FROM dbo.MaruPartnerTerms
    ORDER BY scope, CASE type
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
