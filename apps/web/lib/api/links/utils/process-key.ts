import {
  isDubDomain,
  isUnsupportedKey,
  punyEncode,
  validKeyRegex,
} from "@dub/utils";

export function processKey({ domain, key }: { domain: string; key: string }) {
  // Skip if root domain
  if (key === "_root") {
    return key;
  }

  if (!validKeyRegex.test(key)) {
    return null;
  }
  // if key starts with _, return null (reserved route for Dub internals)
  if (key.startsWith("_")) {
    return null;
  }

  // if key ends with .php, return null (we don't support .php in links)
  if (isUnsupportedKey(key)) {
    return null;
  }

  // remove all leading and trailing slashes from key
  key = key.replace(/^\/+|\/+$/g, "");
  /* 
      for default dub domains, remove all special characters + unicode normalization 
        to remove accents / diacritical marks. this is to prevent phishing/typo squatting
      for custom domains this is fine, since only the workspace can set the key
    */
  if (isDubDomain(domain)) {
    key = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  // encode the key to ascii
  key = punyEncode(key);

  return key;
}
