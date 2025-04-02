// This is not actually a secret key, it's just a string that we XOR with the key to make it case sensitive
const SECRET_KEY = "58ff90c0dc372ded858cbf8fb2306066";

export const CASE_SENSITIVE_DOMAINS = ["buff.ly", "dub-internal-test.com"];

export const encodeKey = (text: string): string => {
  if (!text) return "";

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
  if (!hash) return "";

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

// check if the domain is case sensitive
export const isCaseSensitiveDomain = (domain: string) => {
  return CASE_SENSITIVE_DOMAINS.includes(domain);
};

// encode the key if the domain is case sensitive
export const encodeKeyIfCaseSensitive = ({
  domain,
  key,
}: {
  domain: string;
  key: string;
}) => {
  return isCaseSensitiveDomain(domain) ? encodeKey(key) : key;
};

// decode the key if the domain is case sensitive
export const decodeKeyIfCaseSensitive = ({
  domain,
  key,
}: {
  domain: string;
  key: string;
}) => {
  return isCaseSensitiveDomain(domain) ? decodeKey(key) : key;
};

// decode the link if the domain is case sensitive
export const decodeLinkIfCaseSensitive = (link: any) => {
  if (isCaseSensitiveDomain(link.domain)) {
    const originalKey = decodeKey(link.key);

    if (link.shortLink) {
      link.shortLink = `https://${link.domain}${originalKey === "_root" ? "" : `/${originalKey}`}`;
    }

    link.key = originalKey;
  }

  return link;
};
