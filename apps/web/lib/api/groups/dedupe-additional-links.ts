import { PartnerGroupAdditionalLink } from "@/lib/types";

export function dedupeAdditionalLinks(
  additionalLinks?: PartnerGroupAdditionalLink[] | null,
): PartnerGroupAdditionalLink[] | undefined {
  if (!additionalLinks) {
    return undefined;
  }

  const seen = new Set<string>();

  return additionalLinks.filter((link) => {
    const key =
      link.validationMode === "domain"
        ? link.domain?.toLowerCase()
        : `${link.domain?.toLowerCase()}${link.path || ""}`;

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}
