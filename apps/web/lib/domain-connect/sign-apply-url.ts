import crypto from "node:crypto";
import { DOMAIN_CONNECT_PROVIDER_ID } from "./constants";

export type SignApplyUrlParams = {
  urlSyncUX: string;
  serviceId: string;
  privateKeyPem: string;
  keyHost: string;
  queryParams: Record<string, string>;
};

/**
 * Canonical string: sorted keys, both key and value percent-encoded, joined with "&".
 * Exported for testing.
 */
export function buildSigningString(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k]!)}`)
    .join("&");
}

/**
 * Builds a fully signed Domain Connect apply URL.
 * sig= is placed last (required by Cloudflare).
 */
export function buildSignedApplyUrl({
  urlSyncUX,
  serviceId,
  privateKeyPem,
  keyHost,
  queryParams,
}: SignApplyUrlParams): string {
  const base = [
    urlSyncUX.replace(/\/$/, ""),
    "v2/domainTemplates/providers",
    encodeURIComponent(DOMAIN_CONNECT_PROVIDER_ID),
    "services",
    encodeURIComponent(serviceId),
    "apply",
  ].join("/");

  const signingString = buildSigningString(queryParams);

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signingString);
  sign.end();
  const sig = sign.sign(privateKeyPem, "base64");

  const sortedParts = Object.keys(queryParams)
    .sort()
    .map(
      (k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k]!)}`,
    );
  sortedParts.push(`key=${encodeURIComponent(keyHost)}`);
  sortedParts.push(`sig=${encodeURIComponent(sig)}`);

  return `${base}?${sortedParts.join("&")}`;
}
