import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { createError } from "h3";
import * as schema from "../db/scheme";

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw createError({ statusCode: 500, statusMessage: "数据库连接未配置" });
  }

  return drizzle(neon(databaseUrl), { schema });
}
