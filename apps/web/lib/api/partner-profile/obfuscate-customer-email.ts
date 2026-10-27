/**
 * Obfuscates an email to the form a*****@g****.com:
 * - Local part: first character visible, rest replaced with * (4–7 chars, approximate)
 * - Domain: first character of domain name visible, rest replaced with *, TLD unchanged (4–7 chars, approximate)
 * Uses consistent approximate lengths so the same email always obfuscates to the same string.
 */
const MIN_ASTERISKS = 4;
const MAX_ASTERISKS = 7;

function approximateAsteriskCount(seed: number): number {
  return MIN_ASTERISKS + (Math.abs(seed) % (MAX_ASTERISKS - MIN_ASTERISKS + 1));
}

export function obfuscateCustomerEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const dotIndex = domain.indexOf(".");
  const domainName = dotIndex >= 0 ? domain.slice(0, dotIndex) : domain;
  const tld = dotIndex >= 0 ? domain.slice(dotIndex) : "";
  const localAsterisks = approximateAsteriskCount(
    local.charCodeAt(0) + local.length,
  );
  const domainAsterisks = approximateAsteriskCount(
    domainName.charCodeAt(0) + domainName.length,
  );
  return (
    local[0] +
    "*".repeat(localAsterisks) +
    "@" +
    domainName[0] +
    "*".repeat(domainAsterisks) +
    tld
  );
}
