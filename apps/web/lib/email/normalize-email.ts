// Normalize email for comparison
export function normalizeEmail(email: string) {
  const trimmed = email.toLowerCase().trim();
  const parts = trimmed.split("@");

  if (parts.length !== 2) {
    return trimmed;
  }

  let [username, domain] = parts;

  // Strip plus addressing for all domains
  const plusIndex = username.indexOf("+");
  if (plusIndex !== -1) {
    username = username.substring(0, plusIndex);
  }

  // Strip separators commonly used to create variants of the same address
  username = username.replace(/[._-]/g, "");

  if (!username) {
    return trimmed;
  }

  // Gmail and Google Mail treat dots as irrelevant
  if (domain === "googlemail.com") {
    domain = "gmail.com";
  }

  return `${username}@${domain}`;
}

export function getNormalizedEmail(email: string | null | undefined) {
  return email ? normalizeEmail(email) : null;
}
