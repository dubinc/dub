// Extract domain from email
export function extractEmailDomain(email: string) {
  const parts = email.toLowerCase().trim().split("@");

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }

  return parts[1];
}
