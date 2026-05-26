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
