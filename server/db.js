const sql = require("mssql");

const requiredDbKeys = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"];

function hasDatabaseConfig() {
  return requiredDbKeys.every((key) => Boolean(process.env[key]));
}

const config = {
  server: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT !== "false",
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true",
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise;

function getPool() {
  if (!hasDatabaseConfig()) {
    throw new Error("MSSQL environment variables are not configured.");
  }

  if (!poolPromise) {
    poolPromise = sql.connect(config);
  }

  return poolPromise;
}

module.exports = {
  sql,
  getPool,
  hasDatabaseConfig,
};
