import { validDomainRegex } from "@dub/utils";

export const isValidDomain = (domain: string) => {
  return (
    validDomainRegex.test(domain) &&
    // make sure the domain doesn't contain dub.co/dub.sh/d.to
    !/^(dub\.co|.*\.dub\.co|dub\.sh|.*\.dub\.sh|d\.to|.*\.d\.to)$/i.test(domain)
  );
};

export const isValidDomainFormat = (domain: string) => {
  return validDomainRegex.test(domain);
};

export const isValidDomainFormatWithLocalhost = (domain: string) => {
  const d = domain.trim().toLowerCase();
  return validDomainRegex.test(d) || /^localhost(?::\d{1,5})?$/.test(d);
};
