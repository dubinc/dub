import { Program } from "@prisma/client";
import { conn } from "./connection";

// Get program by publishable key
export const getProgramByPublishableKey = async (publishableKey: string) => {
  const { rows } =
    (await conn.execute(
      "SELECT * FROM Program WHERE publishableKey = ? LIMIT 1",
      [publishableKey],
    )) || {};

  return rows && Array.isArray(rows) && rows.length > 0
    ? (rows[0] as Program)
    : null;
};
