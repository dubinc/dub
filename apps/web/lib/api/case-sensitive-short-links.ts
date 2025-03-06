import { LinkProps } from "../types";

export const CASE_SENSITIVE_DOMAINS = [
  "buff.ly",
  "dub.sh",
  "example.net",
  "acme.pub",
];

const SECRET_KEY = "your-secret-key-here";

export const encodeKey = (text: string): string => {
  const xored = text
    .split("")
    .map((char, i) =>
      String.fromCharCode(
        char.charCodeAt(0) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length),
      ),
    )
    .join("");

  return Buffer.from(xored).toString("base64");
};

export const decodeKey = (hash: string): string => {
  const xored = Buffer.from(hash, "base64").toString();

  return xored
    .split("")
    .map((char, i) =>
      String.fromCharCode(
        char.charCodeAt(0) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length),
      ),
    )
    .join("");
};

export const isCaseSensitiveDomain = (domain: string) => {
  return CASE_SENSITIVE_DOMAINS.includes(domain);
};

export const encodeKeyIfCaseSensitive = ({
  domain,
  key,
}: Pick<LinkProps, "domain" | "key">) => {
  return isCaseSensitiveDomain(domain) ? encodeKey(key) : key;
};

export const decodeKeyIfCaseSensitive = ({
  domain,
  key,
}: Pick<LinkProps, "domain" | "key">) => {
  const caseSensitive = CASE_SENSITIVE_DOMAINS.includes(domain);

  return caseSensitive ? decodeKey(key) : key;
};

export const decodeLinkIfCaseSensitive = (link: any) => {
  if (isCaseSensitiveDomain(link.domain)) {
    const originalKey = decodeKey(link.key);

    link.shortLink = link.shortLink.replace(link.key, originalKey);
    link.key = originalKey;
  }

  return link;
};
