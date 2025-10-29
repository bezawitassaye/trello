import { Pool } from "pg";

// Direct connection using plain password (no URL encoding)
const pool = new Pool({
  connectionString: "postgres://postgres:Bezawit@123@localhost:5432/trello_db",
});

(async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("✅ DB works:", res.rows[0]);
  } catch (err) {
    console.error("❌ DB error:", err);
  } finally {
    await pool.end(); // close connection
  }
})();
