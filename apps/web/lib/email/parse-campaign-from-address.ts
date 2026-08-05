import * as z from "zod/v4";

type ParsedCampaignFromAddress = {
  displayName: string | null;
  email: string;
};

export function parseCampaignFromAddress(
  value: string,
): ParsedCampaignFromAddress | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const namedMatch = trimmed.match(/^(.+?)\s*<([^<>\s]+@[^<>\s]+)>$/);
  if (namedMatch) {
    const displayName = namedMatch[1].trim();
    const email = namedMatch[2].trim();

    if (
      !displayName ||
      displayName.includes("<") ||
      displayName.includes(">") ||
      !z.email().safeParse(email).success
    ) {
      return null;
    }

    return { displayName, email };
  }

  if (trimmed.includes("<") || trimmed.includes(">")) {
    return null;
  }

  if (!z.email().safeParse(trimmed).success) {
    return null;
  }

  return { displayName: null, email: trimmed };
}

export function formatCampaignFromAddress({
  displayName,
  email,
}: ParsedCampaignFromAddress): string {
  const normalizedEmail = email.toLowerCase();

  if (displayName) {
    return `${displayName.trim()} <${normalizedEmail}>`;
  }

  return normalizedEmail;
}

export function resolveCampaignFromAddress({
  from,
  programName,
}: {
  from: string;
  programName: string;
}): string {
  const parsed = parseCampaignFromAddress(from);
  if (!parsed) return from;

  if (parsed.displayName) {
    return formatCampaignFromAddress(parsed);
  }

  return `${programName} <${parsed.email.toLowerCase()}>`;
}
