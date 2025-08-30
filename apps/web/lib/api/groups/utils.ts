import { PartnerGroupDefaultLink } from "@/lib/types";

// Identifies new default links added to a group
export function findNewDefaultPartnerLink(
  oldLinks: PartnerGroupDefaultLink[] | null,
  newLinks: PartnerGroupDefaultLink[],
): PartnerGroupDefaultLink | null {
  return (
    newLinks.find(
      (newLink) => !oldLinks?.some((old) => old.url === newLink.url),
    ) || null
  );
}
