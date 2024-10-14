import { conn } from "./connection";

export const checkIfUserExists = async (userId: string) => {
  const { rows } =
    (await conn.execute("SELECT 1 FROM User WHERE id = ? LIMIT 1", [userId])) ||
    {};

  return rows && Array.isArray(rows) && rows.length > 0;
};
