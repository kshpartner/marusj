require("dotenv").config();

const { getPool, sql } = require("../server/db");

async function main() {
  const password = process.argv[2] || process.env.ADMIN_PASSWORD || "admin1234";
  const pool = await getPool();
  const result = await pool
    .request()
    .input("password", sql.NVarChar, password)
    .query(`
      UPDATE dbo.MaruPartnerUsers
      SET password = @password,
          updated_at = SYSUTCDATETIME()
      WHERE uid = 'admin'
         OR username = 'admin'
    `);

  console.log(`Updated admin password rows: ${result.rowsAffected[0] || 0}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
