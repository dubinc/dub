import { conn } from "./connection";
import { EdgeDomainProps } from "./types";

export const getDomainViaEdge = async (domain: string) => {
  const { rows } =
    (await conn.execute("SELECT * FROM Domain WHERE slug = ?", [domain])) || {};

  return rows && Array.isArray(rows) && rows.length > 0
    ? (rows[0] as EdgeDomainProps)
    : null;
};
