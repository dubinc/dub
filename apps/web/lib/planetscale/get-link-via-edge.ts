import { punyEncode } from "@dub/utils";
import {
  decodeKeyIfCaseSensitive,
  encodeKey,
  isCaseSensitiveDomain,
} from "../api/links/case-sensitivity";
import { conn } from "./connection";
import { EdgeLinkProps, EdgeLinkWithWebhooks } from "./types";

export const getLinkViaEdge = async ({
  domain,
  key,
}: {
  domain: string;
  key: string;
}): Promise<EdgeLinkWithWebhooks | null> => {
  const isCaseSensitive = isCaseSensitiveDomain(domain);
  const keyToQuery = isCaseSensitive
    ? // for case sensitive domains, we need to encode the key
      encodeKey(key)
    : // for non-case sensitive domains, we need to make sure that the key is always URI-decoded + punycode-encoded
      // (cause that's how we store it in MySQL)
      punyEncode(decodeURIComponent(key));

  const { rows } =
    (await conn.execute(
      `SELECT Link.*, LinkWebhook.webhookId
       FROM Link
       LEFT JOIN LinkWebhook ON Link.id = LinkWebhook.linkId
       WHERE Link.domain = ? AND Link.\`key\` = ?`,
      [domain, keyToQuery],
    )) || {};

  if (!rows || !Array.isArray(rows) || rows.length === 0) return null;

  const first = rows[0] as EdgeLinkProps & { webhookId: string | null };
  const { webhookId: _w, ...link } = first;
  const webhooks = (rows as (EdgeLinkProps & { webhookId: string | null })[])
    .map((r) => r.webhookId)
    .filter((id): id is string => id != null)
    .map((webhookId) => ({ webhookId }));

  return {
    ...link,
    key: decodeKeyIfCaseSensitive({ domain, key }),
    webhooks,
  };
};
