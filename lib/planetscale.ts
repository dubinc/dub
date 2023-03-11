import { connect } from "@planetscale/database";

export const pscale_config = {
  url: process.env["DATABASE_URL"] || "mysql://user:pass@host",
};

export const conn = connect(pscale_config);

export async function getLinkViaEdge(domain: string, key: string) {
  const { rows } =
    (await conn.execute(
      "SELECT `key`, url, clicks, userId, publicStats FROM Link WHERE domain = ? AND `key` = ?",
      [domain, key],
    )) || {};

  return rows && Array.isArray(rows) && rows.length > 0
    ? (rows[0] as {
        key: string;
        url: string;
        clicks: number;
        userId: number;
        publicStats: boolean;
      })
    : null;
}
