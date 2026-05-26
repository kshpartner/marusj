CREATE SEQUENCE dbo.CustomerUidSeq
  AS INT
  START WITH 1001
  INCREMENT BY 1;

CREATE TABLE dbo.Users (
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

CREATE INDEX IX_Users_ParentUid ON dbo.Users(parent_uid);

INSERT INTO dbo.Users (uid, username, password, name, role, parent_uid, status)
VALUES ('admin', 'admin', '1', N'관리자', 'admin', NULL, 'active');

CREATE TABLE dbo.InviteLinks (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  ref_uid NVARCHAR(50) NOT NULL,
  clicks INT NOT NULL DEFAULT 0,
  signups INT NOT NULL DEFAULT 0,
  status NVARCHAR(30) NOT NULL DEFAULT 'active',
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE INDEX IX_InviteLinks_RefUid ON dbo.InviteLinks(ref_uid);
