import { LinkProps } from "../types";

export const CASE_SENSITIVE_DOMAINS = ["buff.ly", "dub.sh"];

export const encodeKey = (text: string) => {
  return Buffer.from(text).toString("base64");
};

export const decodeKey = (encoded: string) => {
  return Buffer.from(encoded, "base64").toString();
};

export const encodeKeyIfCaseSensitive = ({
  domain,
  key,
}: Pick<LinkProps, "domain" | "key">) => {
  const caseSensitive = CASE_SENSITIVE_DOMAINS.includes(domain);

  return caseSensitive ? encodeKey(key) : key;
};

export const decodeKeyIfCaseSensitive = ({
  domain,
  key,
}: Pick<LinkProps, "domain" | "key">) => {
  const caseSensitive = CASE_SENSITIVE_DOMAINS.includes(domain);

  return caseSensitive ? decodeKey(key) : key;
};

export const isCaseSensitiveDomain = (domain: string) => {
  return CASE_SENSITIVE_DOMAINS.includes(domain);
};
