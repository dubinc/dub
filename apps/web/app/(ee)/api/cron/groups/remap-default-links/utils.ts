import { Link, PartnerGroupDefaultLink } from "@dub/prisma/client";

// Helper function to normalize URL by removing UTM parameters
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `https://${urlObj.host}${urlObj.pathname}`;
  } catch {
    return url;
  }
}

// Add a new method that update the partner group default links when their group changes
export function remapPartnerGroupDefaultLinks({
  partnerId,
  partnerLinks,
  newGroupDefaultLinks,
}: {
  partnerId: string;
  partnerLinks: Pick<
    Link,
    "id" | "url" | "partnerId" | "partnerGroupDefaultLinkId"
  >[];
  newGroupDefaultLinks: Pick<
    PartnerGroupDefaultLink,
    "id" | "domain" | "url"
  >[];
}) {
  const linksToCreate: Array<{
    domain: string;
    url: string;
    partnerId: string;
    partnerGroupDefaultLinkId: string;
  }> = [];

  const linksToUpdate: Array<{
    id: string;
    partnerGroupDefaultLinkId: string;
  }> = [];

  const linksToRemoveMapping: string[] = [];

  // Create a map of normalized URLs to new group default links for quick lookup
  const newDefaultLinksByUrl = new Map<
    string,
    Pick<PartnerGroupDefaultLink, "id" | "domain" | "url">
  >();
  newGroupDefaultLinks.forEach((defaultLink) => {
    const normalizedUrl = normalizeUrl(defaultLink.url);
    newDefaultLinksByUrl.set(normalizedUrl, defaultLink);
  });

  // Process existing partner links
  partnerLinks.forEach((link) => {
    const normalizedLinkUrl = normalizeUrl(link.url);
    const matchingNewDefault = newDefaultLinksByUrl.get(normalizedLinkUrl);

    if (matchingNewDefault) {
      // URL matches (excluding url params) - update the mapping
      linksToUpdate.push({
        id: link.id,
        partnerGroupDefaultLinkId: matchingNewDefault.id,
      });
      // Remove from the map so we don't create a duplicate
      newDefaultLinksByUrl.delete(normalizedLinkUrl);
    } else {
      // URL doesn't match - remove the mapping
      linksToRemoveMapping.push(link.id);
    }
  });

  // Create new links for any remaining new default links that didn't match existing ones
  newDefaultLinksByUrl.forEach((defaultLink) => {
    linksToCreate.push({
      domain: defaultLink.domain,
      url: defaultLink.url,
      partnerId,
      partnerGroupDefaultLinkId: defaultLink.id,
    });
  });

  return {
    linksToCreate,
    linksToUpdate,
    linksToRemoveMapping,
  };
}
