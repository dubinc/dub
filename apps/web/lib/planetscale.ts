import { connect } from "@planetscale/database";

export const pscale_config = {
  url: process.env.DATABASE_URL,
};

export const conn = connect(pscale_config);

export const getLinkViaEdge = async (domain: string, key: string) => {
  if (!process.env.DATABASE_URL) return null;

  const { rows } =
    (await conn.execute(
      "SELECT `key`, url, password, proxy, title, description, image, clicks, userId, publicStats FROM Link WHERE domain = ? AND `key` = ?",
      [domain, decodeURIComponent(key)], // we need to make sure that the key is always decoded (cause that's how we store it in MySQL)
    )) || {};

  return rows && Array.isArray(rows) && rows.length > 0
    ? (rows[0] as {
        key: string;
        url: string;
        password: string | null;
        proxy: number;
        title: string;
        description: string;
        image: string;
        clicks: number;
        userId: number;
        publicStats: number;
      })
    : null;
};
