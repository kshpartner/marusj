IF NOT EXISTS (SELECT 1 FROM sys.sequences WHERE name = 'MaruPartnerSalesUidSeq' AND SCHEMA_NAME(schema_id) = 'dbo')
BEGIN
  EXEC('CREATE SEQUENCE dbo.MaruPartnerSalesUidSeq AS INT START WITH 1 INCREMENT BY 1');
END;

IF NOT EXISTS (SELECT 1 FROM sys.sequences WHERE name = 'MaruPartnerCenterUidSeq' AND SCHEMA_NAME(schema_id) = 'dbo')
BEGIN
  EXEC('CREATE SEQUENCE dbo.MaruPartnerCenterUidSeq AS INT START WITH 1 INCREMENT BY 1');
END;

IF NOT EXISTS (SELECT 1 FROM sys.sequences WHERE name = 'MaruPartnerMemberUidSeq' AND SCHEMA_NAME(schema_id) = 'dbo')
BEGIN
  EXEC('CREATE SEQUENCE dbo.MaruPartnerMemberUidSeq AS INT START WITH 1001 INCREMENT BY 1');
END;

IF OBJECT_ID('dbo.MaruPartnerUsers', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.MaruPartnerUsers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    uid NVARCHAR(50) NOT NULL UNIQUE,
    username NVARCHAR(100) NULL UNIQUE,
    password NVARCHAR(255) NULL,
    name NVARCHAR(100) NOT NULL,
    phone NVARCHAR(50) NULL,
    email NVARCHAR(255) NULL,
    role NVARCHAR(30) NOT NULL,
    parent_uid NVARCHAR(50) NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'active',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );

  CREATE INDEX IX_MaruPartnerUsers_ParentUid ON dbo.MaruPartnerUsers(parent_uid);
END;

IF COL_LENGTH('dbo.MaruPartnerUsers', 'terms_yn') IS NULL
BEGIN
  ALTER TABLE dbo.MaruPartnerUsers ADD terms_yn CHAR(1) NULL;
END;

IF COL_LENGTH('dbo.MaruPartnerUsers', 'privacy_yn') IS NULL
BEGIN
  ALTER TABLE dbo.MaruPartnerUsers ADD privacy_yn CHAR(1) NULL;
END;

IF COL_LENGTH('dbo.MaruPartnerUsers', 'marketing_yn') IS NULL
BEGIN
  ALTER TABLE dbo.MaruPartnerUsers ADD marketing_yn CHAR(1) NULL;
END;

IF COL_LENGTH('dbo.MaruPartnerUsers', 'signup_source') IS NULL
BEGIN
  ALTER TABLE dbo.MaruPartnerUsers ADD signup_source NVARCHAR(50) NULL;
END;

IF NOT EXISTS (SELECT 1 FROM dbo.MaruPartnerUsers WHERE uid = 'admin')
BEGIN
  INSERT INTO dbo.MaruPartnerUsers (uid, username, password, name, role, parent_uid, status)
  VALUES ('admin', 'admin', '1', N'관리자', 'admin', NULL, 'active');
END;

IF OBJECT_ID('dbo.MaruPartnerInviteLinks', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.MaruPartnerInviteLinks (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    ref_uid NVARCHAR(50) NOT NULL,
    clicks INT NOT NULL DEFAULT 0,
    signups INT NOT NULL DEFAULT 0,
    status NVARCHAR(30) NOT NULL DEFAULT 'active',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );

  CREATE INDEX IX_MaruPartnerInviteLinks_RefUid ON dbo.MaruPartnerInviteLinks(ref_uid);
END;

IF OBJECT_ID('dbo.MaruPartnerTerms', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.MaruPartnerTerms (
    id INT IDENTITY(1,1) PRIMARY KEY,
    scope NVARCHAR(50) NOT NULL DEFAULT 'funeral_member',
    type NVARCHAR(50) NOT NULL,
    title NVARCHAR(200) NOT NULL,
    version NVARCHAR(30) NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    required_yn CHAR(1) NOT NULL DEFAULT 'Y',
    active_yn CHAR(1) NOT NULL DEFAULT 'N',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );

  CREATE INDEX IX_MaruPartnerTerms_ScopeTypeActive ON dbo.MaruPartnerTerms(scope, type, active_yn);
END;

IF COL_LENGTH('dbo.MaruPartnerTerms', 'scope') IS NULL
BEGIN
  ALTER TABLE dbo.MaruPartnerTerms ADD scope NVARCHAR(50) NOT NULL DEFAULT 'funeral_member';
END;

IF OBJECT_ID('dbo.MaruPartnerTermAgreements', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.MaruPartnerTermAgreements (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_uid NVARCHAR(50) NOT NULL,
    term_id INT NOT NULL,
    term_scope NVARCHAR(50) NOT NULL DEFAULT 'funeral_member',
    term_type NVARCHAR(50) NOT NULL,
    term_title NVARCHAR(200) NOT NULL,
    term_version NVARCHAR(30) NOT NULL,
    agreed_yn CHAR(1) NOT NULL,
    agreed_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ip NVARCHAR(80) NULL,
    user_agent NVARCHAR(500) NULL
  );

  CREATE INDEX IX_MaruPartnerTermAgreements_UserUid ON dbo.MaruPartnerTermAgreements(user_uid);
END;

IF COL_LENGTH('dbo.MaruPartnerTermAgreements', 'term_scope') IS NULL
BEGIN
  ALTER TABLE dbo.MaruPartnerTermAgreements ADD term_scope NVARCHAR(50) NOT NULL DEFAULT 'funeral_member';
END;

IF NOT EXISTS (SELECT 1 FROM dbo.MaruPartnerTerms WHERE type = 'service_terms')
BEGIN
  INSERT INTO dbo.MaruPartnerTerms (type, title, version, content, required_yn, active_yn)
  VALUES (
    'service_terms',
    N'상조 서비스 이용약관',
    '1.0',
    N'제1조 목적
본 약관은 마루 파트너 관리 시스템을 통해 상조 서비스 가입 상담 및 신청을 진행하는 고객과 관리자, 영업사원 간의 기본적인 이용 조건과 절차를 정합니다.

제2조 가입 신청
고객은 admin 또는 영업사원이 제공한 상조 가입 링크를 통해 본인 정보를 입력하고 필수 약관에 동의한 뒤 가입 신청을 할 수 있습니다. 가입 신청은 상담 및 확인 절차를 거쳐 최종 처리됩니다.

제3조 영업사원 연결
가입 링크에 포함된 상위 UID를 기준으로 고객은 admin 또는 해당 영업사원 하위 상조 회원으로 등록됩니다. 이 정보는 가입 경로 확인, 고객 관리, 커미션 산정의 기초 자료로 활용될 수 있습니다.

제4조 정보의 정확성
고객은 가입 신청 시 정확한 정보를 제공해야 하며, 잘못된 정보로 인해 상담, 안내, 서비스 제공이 지연되거나 제한될 수 있습니다.

제5조 신청 변경 및 철회
고객은 가입 상담 또는 처리 과정에서 신청 내용의 변경이나 철회를 요청할 수 있습니다. 이미 별도 계약이 체결된 경우에는 해당 계약서와 관련 법령이 우선 적용됩니다.',
    'Y',
    'Y'
  );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.MaruPartnerTerms WHERE type = 'privacy_policy')
BEGIN
  INSERT INTO dbo.MaruPartnerTerms (type, title, version, content, required_yn, active_yn)
  VALUES (
    'privacy_policy',
    N'개인정보 수집 및 이용 동의',
    '1.0',
    N'1. 수집 및 이용 목적
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
보유 기간이 종료되거나 처리 목적이 달성된 개인정보는 지체 없이 파기합니다. 개인정보 관련 문의는 서비스 운영자 또는 개인정보 보호 담당자에게 요청할 수 있습니다.',
    'Y',
    'Y'
  );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.MaruPartnerTerms WHERE type = 'marketing_consent')
BEGIN
  INSERT INTO dbo.MaruPartnerTerms (type, title, version, content, required_yn, active_yn)
  VALUES (
    'marketing_consent',
    N'마케팅 수신 동의',
    '1.0',
    N'1. 수집 및 이용 목적
상조 상품 안내, 이벤트 및 혜택 안내, 상담 후속 안내, 신규 서비스 안내 등 마케팅 및 광고성 정보 제공을 위해 개인정보를 이용합니다.

2. 이용 항목
이름, 연락처, 이메일, 가입 경로, 상담 이력

3. 안내 방법
전화, 문자메시지, 카카오 알림톡 또는 친구톡, 이메일 등 고객이 제공한 연락 수단으로 안내할 수 있습니다.

4. 보유 및 이용 기간
마케팅 수신 동의 철회 시 또는 회원 관리 목적 종료 시까지 보유 및 이용합니다.

5. 동의 거부 및 철회
마케팅 수신 동의는 선택 사항이며, 동의하지 않아도 상조 가입 신청에는 제한이 없습니다. 고객은 언제든지 수신 동의를 철회할 수 있습니다.',
    'N',
    'Y'
  );
END;
