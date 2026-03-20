import { LRUCache } from "lru-cache";
import { conn } from "./connection";
import { EdgeDomainProps } from "./types";

const domainLRUCache = new LRUCache<string, EdgeDomainProps | null>({
  max: 1000,
  ttl: 5 * 60 * 1000, // 5 minutes
});

export const getDomainViaEdge = async (domain: string) => {
  const cached = domainLRUCache.get(domain);
  if (cached !== undefined) {
    return cached;
  }

  const { rows } =
    (await conn.execute<EdgeDomainProps>(
      "SELECT * FROM Domain WHERE slug = ?",
      [domain],
    )) || {};

  const result =
    rows && Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (result !== null) {
    domainLRUCache.set(domain, result);
  }
  return result;
};
