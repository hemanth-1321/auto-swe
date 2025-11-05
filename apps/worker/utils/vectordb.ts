import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.PG_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});
