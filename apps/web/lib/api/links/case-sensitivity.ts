// This is not actually a secret key, it's just a string that we XOR with the key to make it case sensitive
const XOR_SECRET_KEY = "58ff90c0dc372ded858cbf8fb2306066";

export const CASE_SENSITIVE_DOMAINS = [
  "biltapp.link",
  "buff.ly",
  "dub-internal-test.com",
  "go.homeserve.fr",
  "go.homeserve.be",
  "jbbr.pro",
  "new.biltapp.link",
];

export const encodeKey = (text: string): string => {
  if (!text) return "";

  const xored = text
    .split("")
    .map((char, i) =>
      String.fromCharCode(
        char.charCodeAt(0) ^
          XOR_SECRET_KEY.charCodeAt(i % XOR_SECRET_KEY.length),
      ),
    )
    .join("");

  // Use hex encoding instead of base64 to avoid case-sensitivity collisions
  // Hex is case-insensitive, so we normalize to lowercase for consistency
  // Prefix with "h:" to distinguish from old base64 format (":" is not in base64 alphabet)
  const hexEncoded = Buffer.from(xored).toString("hex").toLowerCase();
  return `h:${hexEncoded}`;
};

export const decodeKey = (hash: string): string => {
  if (!hash) return "";

  let xored: string;

  // Backwards compatibility: detect format by prefix
  // New format: "h:" prefix (case-insensitive) indicates hex encoding
  // Old format: no prefix, base64 encoding
  // Normalize prefix check to handle case-insensitive databases
  const normalizedHash = hash.toLowerCase();
  if (normalizedHash.startsWith("h:")) {
    // New hex format - remove prefix and decode as hex
    // Normalize to lowercase to handle case-insensitive database storage
    const hexPart = normalizedHash.slice(2);
    xored = Buffer.from(hexPart, "hex").toString("utf8");
  } else {
    // Old base64 format - decode as base64
    xored = Buffer.from(hash, "base64").toString("utf8");
  }

  return xored
    .split("")
    .map((char, i) =>
      String.fromCharCode(
        char.charCodeAt(0) ^
          XOR_SECRET_KEY.charCodeAt(i % XOR_SECRET_KEY.length),
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

    return {
      ...link,
      key: originalKey,
      ...(link.shortLink && {
        shortLink: `https://${link.domain}${originalKey === "_root" ? "" : `/${originalKey}`}`,
      }),
    };
  }

  return link;
};
