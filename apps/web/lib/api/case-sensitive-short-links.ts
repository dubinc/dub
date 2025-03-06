import { Link } from "@prisma/client";
import { LinkProps } from "../types";

export const CASE_SENSITIVE_DOMAINS = ["buff.ly", "dub.sh"];

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

// TODO:
// Combine all these methods with optional params

// Decode key if it's case sensitive
export const decodeKeyIfCaseSensitive = ({
  domain,
  key,
}: Pick<LinkProps, "domain" | "key">) => {
  const caseSensitive = CASE_SENSITIVE_DOMAINS.includes(domain);

  return caseSensitive ? decodeKey(key) : key;
};

// Decode shortLink if it's case sensitive
export const decodeShortLinkIfCaseSensitive = (shortLink: string) => {
  const url = new URL(shortLink);
  const pathParts = url.pathname.split("/").filter(Boolean);

  const domain = url.hostname;
  const key = pathParts[pathParts.length - 1];

  if (isCaseSensitiveDomain(domain)) {
    return shortLink.replace(key, decodeKey(key));
  }

  return shortLink;
};

// Decode key + shortLink if it's case sensitive
export const decodeIfCaseSensitive = (link: Link) => {
  const caseSensitive = CASE_SENSITIVE_DOMAINS.includes(link.domain);

  if (caseSensitive) {
    const originalKey = decodeKey(link.key);

    link.key = originalKey;
    link.shortLink = link.shortLink.replace(link.key, originalKey);
  }

  return link;
};
