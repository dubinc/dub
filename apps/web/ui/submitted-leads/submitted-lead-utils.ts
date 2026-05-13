import { GOOGLE_FAVICON_URL, OG_AVATAR_URL } from "@dub/utils";

// Formats a formData field value for display
export function formatFormDataValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  if (typeof value === "number" && Number.isNaN(value)) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map((v) => String(v)).join(", ");
  }

  if (typeof value === "object" && "toISOString" in value) {
    try {
      return new Date(value as Date).toLocaleDateString();
    } catch {
      return String(value);
    }
  }

  if (typeof value === "number") {
    return value.toLocaleString();
  }

  return String(value);
}

// Gets company logo URL from email domain
export function getCompanyLogoUrl(email: string) {
  const emailDomain = email.split("@")[1];
  return emailDomain
    ? `${GOOGLE_FAVICON_URL}${emailDomain}`
    : `${OG_AVATAR_URL}${email}`;
}
