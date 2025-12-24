import "dotenv/config";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: path.join("schema"),
  datasource: {
    url: env("DATABASE_URL"),
  },
});
