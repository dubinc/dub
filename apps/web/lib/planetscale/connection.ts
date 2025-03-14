import { createConnection } from "mysql2/promise";

export const conn = createConnection({
  uri: process.env.DATABASE_URL,
});
