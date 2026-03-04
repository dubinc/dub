import { conn } from "./connection";
import { EdgeLinkProps } from "./types";

/**
 * Get all redirect rules for a domain from the database.
 * Rules are links with isRule = true.
 */
export const getRulesViaEdge = async (domain: string) => {
  const { rows } =
    (await conn.execute(
      "SELECT * FROM Link WHERE domain = ? AND isRule = 1",
      [domain],
    )) || {};

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  return rows as EdgeLinkProps[];
};
