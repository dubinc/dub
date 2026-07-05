import { punyEncode } from "@dub/utils";
import {
  decodeKeyIfCaseSensitive,
  encodeKey,
  isCaseSensitiveDomain,
} from "../api/links/case-sensitivity";
import { conn } from "./connection";
import { EdgeLinkProps } from "./types";

const getLinkViaEdgeHelper = async ({
  domain,
  key,
}: {
  domain: string;
  key: string;
}): Promise<EdgeLinkProps | null> => {
  const isCaseSensitive = isCaseSensitiveDomain(domain);
  const keyToQuery = isCaseSensitive
    ? // for case sensitive domains, we need to encode the key
      encodeKey(key)
    : // for non-case sensitive domains, we need to make sure that the key is always URI-decoded + punycode-encoded
      // (cause that's how we store it in MySQL)
      punyEncode(decodeURIComponent(key));

  const { rows } =
    (await conn.execute(`SELECT * FROM Link WHERE domain = ? AND \`key\` = ?`, [
      domain,
      keyToQuery,
    ])) || {};

  if (!rows || !Array.isArray(rows) || rows.length === 0) return null;

  const link = rows[0] as EdgeLinkProps;

  return {
    ...link,
    key: decodeKeyIfCaseSensitive({ domain, key }),
  };
};

const inFlightLinkLookups = new Map<
  string,
  Promise<Awaited<ReturnType<typeof getLinkViaEdgeHelper>>>
>();

export const getLinkViaEdge = async ({
  domain,
  key,
}: {
  domain: string;
  key: string;
}): Promise<Awaited<ReturnType<typeof getLinkViaEdgeHelper>>> => {
  const lookupKey = `${domain}:${key}`;
  const existingLookup = inFlightLinkLookups.get(lookupKey);

  if (existingLookup) {
    console.log(`[getLinkViaEdge] ${lookupKey} - Existing lookup found`);
    return await existingLookup;
  }

  const lookupPromise = getLinkViaEdgeHelper({ domain, key }).finally(() => {
    inFlightLinkLookups.delete(lookupKey);
  });

  inFlightLinkLookups.set(lookupKey, lookupPromise);

  return await lookupPromise;
};
