import { punyEncode } from "@dub/utils";
import {
  decodeKeyIfCaseSensitive,
  decodeLinkIfCaseSensitive,
} from "../api/case-sensitive-short-links";
import { conn } from "./connection";
import { EdgeLinkProps } from "./types";

export const getLinkViaEdge = async ({
  domain,
  key,
  caseSensitive = true,
}: {
  domain: string;
  key: string;
  caseSensitive?: boolean;
}) => {
  const decodedKey = caseSensitive
    ? decodeKeyIfCaseSensitive({
        domain,
        key,
      })
    : key;

  const { rows } =
    (await conn.execute(
      "SELECT * FROM Link WHERE domain = ? AND `key` = ?",
      [domain, punyEncode(decodeURIComponent(decodedKey))], // we need to make sure that the key is always URI-decoded + punycode-encoded (cause that's how we store it in MySQL)
    )) || {};

  const link =
    rows && Array.isArray(rows) && rows.length > 0
      ? (rows[0] as EdgeLinkProps)
      : null;

  return link ? (caseSensitive ? decodeLinkIfCaseSensitive(link) : link) : null;
};
