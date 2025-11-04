import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

export const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ PostgreSQL подключена успешно");
    client.release();
    return true;
  } catch (error) {
    console.error("❌ Ошибка подключения к PostgreSQL:", error);
    return false;
  }
};
