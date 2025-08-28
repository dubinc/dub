import { DefaultPartnerLink } from "@/lib/types";

// Identifies new default links added to a group
export function findNewDefaultPartnerLink(
  oldLinks: DefaultPartnerLink[] | null,
  newLinks: DefaultPartnerLink[],
): DefaultPartnerLink | null {
  return (
    newLinks.find(
      (newLink) => !oldLinks?.some((old) => old.url === newLink.url),
    ) || null
  );
}
