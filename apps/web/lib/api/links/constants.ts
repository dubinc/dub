// List of domains that support case sensitive short links
export const CASE_SENSITIVE_DOMAINS = [
  "buff.ly",
  "example.net",
  "example.com",
  "dub.sh",
];

// TODO:
// Need a better hash function (+ move to a new file)

const SECRET_KEY = "your-secret-key-here";

// Simple XOR cipher with base64 encoding
export const hashKey = (text: string): string => {
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
