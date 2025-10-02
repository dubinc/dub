import { punyEncode } from "@dub/utils";
import { conn } from "./connection";
import { EdgeLinkProps } from "./types";

type GetLinkParams = {
  id?: string;
  domain?: string;
  key?: string;
};

export const getLinkViaEdge = async ({ id, domain, key }: GetLinkParams) => {
  if (!id && (!domain || !key)) {
    throw new Error("Either id or both domain and key must be provided");
  }

  const isIdSearch = !!id;

  const { rows } =
    (await conn.execute(
      `SELECT l.*, u.id as userId, u.createdAt as userCreatedAt, u.email as userEmail,
        (SELECT SUM(clicks) FROM Link WHERE userId = u.id) as totalUserClicks
       FROM Link l 
       LEFT JOIN User u ON l.userId = u.id 
       WHERE ${isIdSearch ? "l.id = ?" : "l.domain = ? AND l.key = ?"}`,
      isIdSearch ? [id] : [domain, punyEncode(decodeURIComponent(key!))], // we need to make sure that the key is always URI-decoded + punycode-encoded (cause that's how we store it in MySQL)
    )) || {};

  return rows && Array.isArray(rows) && rows.length > 0
    ? (rows[0] as EdgeLinkProps)
    : null;
};
