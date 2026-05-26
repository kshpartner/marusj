IF NOT EXISTS (SELECT 1 FROM sys.sequences WHERE name = 'MaruPartnerSalesUidSeq' AND SCHEMA_NAME(schema_id) = 'dbo')
BEGIN
  EXEC('CREATE SEQUENCE dbo.MaruPartnerSalesUidSeq AS INT START WITH 1 INCREMENT BY 1');
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
    type NVARCHAR(50) NOT NULL,
    title NVARCHAR(200) NOT NULL,
    version NVARCHAR(30) NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    required_yn CHAR(1) NOT NULL DEFAULT 'Y',
    active_yn CHAR(1) NOT NULL DEFAULT 'N',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );

  CREATE INDEX IX_MaruPartnerTerms_TypeActive ON dbo.MaruPartnerTerms(type, active_yn);
END;

IF OBJECT_ID('dbo.MaruPartnerTermAgreements', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.MaruPartnerTermAgreements (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_uid NVARCHAR(50) NOT NULL,
    term_id INT NOT NULL,
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

IF NOT EXISTS (SELECT 1 FROM dbo.MaruPartnerTerms WHERE type = 'service_terms')
BEGIN
  INSERT INTO dbo.MaruPartnerTerms (type, title, version, content, required_yn, active_yn)
  VALUES (
    'service_terms',
    N'상조 서비스 이용약관',
    '1.0',
    N'상조 서비스 이용과 관련한 기본 약관 내용을 입력해주세요.',
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
    N'수집 항목, 이용 목적, 보유 기간 등 개인정보 처리 내용을 입력해주세요.',
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
    N'이벤트, 혜택, 안내 메시지 수신 동의 내용을 입력해주세요.',
    'N',
    'Y'
  );
END;
