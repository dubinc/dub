import { conn } from "./connection";
import { EdgeLinkProps } from "./types";

export const getShortLinkViaEdge = async (shortLink: string) => {
  const { rows } =
    (await conn.execute("SELECT * FROM Link WHERE shortLink = ?", [
      shortLink,
    ])) || {};

  return rows && Array.isArray(rows) && rows.length > 0
    ? (rows[0] as EdgeLinkProps)
    : null;
};
