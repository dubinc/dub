import { punyEncode } from "@dub/utils";
import {
  decodeKeyIfCaseSensitive,
  decodeLinkIfCaseSensitive,
} from "../api/case-sensitive-short-links";
import { conn } from "./connection";
import { EdgeLinkProps } from "./types";

export const getLinkViaEdge = async (domain: string, key: string) => {
  key = decodeKeyIfCaseSensitive({
    domain,
    key,
  });

  const { rows } =
    (await conn.execute(
      "SELECT * FROM Link WHERE domain = ? AND `key` = ?",
      [domain, punyEncode(decodeURIComponent(key))], // we need to make sure that the key is always URI-decoded + punycode-encoded (cause that's how we store it in MySQL)
    )) || {};

  const link =
    rows && Array.isArray(rows) && rows.length > 0
      ? (rows[0] as EdgeLinkProps)
      : null;

  return link ? decodeLinkIfCaseSensitive(link) : null;
};
