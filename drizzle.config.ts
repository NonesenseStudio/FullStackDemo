import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./server/db/scheme.ts",
  out: "./server/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
