import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "trello_db",
  password: "1234",
  port: 5433, // important!
});


export default pool;
