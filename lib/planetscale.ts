import { connect } from "@planetscale/database";

export const pscale_config = {
  url: process.env.DATABASE_URL || "mysql://user:pass@host",
};

export const conn = process.env.DATABASE_URL ? connect(pscale_config) : null;

// custom cached connection that sets next.revalidate to 900s
export const cachedConn = process.env.DATABASE_URL
  ? connect({
      ...pscale_config,
      fetch: (url, init) => {
        // set next.revalidate
        return fetch(url, {
          ...init,
          cache: undefined,
          next: {
            revalidate: 900,
          },
        });
      },
    })
  : null;

export const getLinkViaEdge = async (domain: string, key: string) => {
  if (!conn) return null;

  const { rows } =
    (await conn.execute(
      "SELECT `key`, url, proxy, title, description, image, clicks, userId, publicStats FROM Link WHERE domain = ? AND `key` = ?",
      [domain, decodeURIComponent(key)], // we need to make sure that the key is always decoded (cause that's how we store it in MySQL)
    )) || {};

  return rows && Array.isArray(rows) && rows.length > 0
    ? (rows[0] as {
        key: string;
        url: string;
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

export const getTotalVerifiedDomains = async () => {
  if (!cachedConn) return 1000;

  const { rows } = await cachedConn.execute(
    "SELECT COUNT(*) FROM Domain WHERE verified = 1",
  );
  return rows && Array.isArray(rows) && rows.length > 0
    ? rows[0]["count(*)"]
    : 1000;
};

export const getTotalLinks = async () => {
  if (!cachedConn) return 20000;

  const { rows } = await cachedConn.execute("SELECT COUNT(*) FROM Link");
  return rows && Array.isArray(rows) && rows.length > 0
    ? rows[0]["count(*)"]
    : 20000;
};

export const getTotalUsers = async () => {
  if (!cachedConn) return 10000;

  const { rows } = await cachedConn.execute("SELECT COUNT(*) FROM User");
  return rows && Array.isArray(rows) && rows.length > 0
    ? rows[0]["count(*)"]
    : 10000;
};
