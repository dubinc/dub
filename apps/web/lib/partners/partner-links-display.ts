export const partnerLinksDisplayPropertyIds = [
  "link",
  "rewards",
  "title",
  "description",
] as const;

export type PartnerLinksDisplayProperty =
  (typeof partnerLinksDisplayPropertyIds)[number];

export const partnerLinksDisplayProperties: {
  id: PartnerLinksDisplayProperty;
  label: string;
  switch?: PartnerLinksDisplayProperty;
}[] = [
  { id: "link", label: "Short link" },
  { id: "rewards", label: "Reward details", switch: "description" },
  { id: "title", label: "Link title" },
  { id: "description", label: "Link description", switch: "rewards" },
];

export const defaultPartnerLinksDisplayProperties: PartnerLinksDisplayProperty[] =
  ["link", "rewards"];

/**
 * Preferences saved before reward details / description only stored "link"
 * and/or "title". Those views always showed the short link and reward line.
 */
export function normalizePartnerLinksDisplayProperties(
  properties: PartnerLinksDisplayProperty[],
): PartnerLinksDisplayProperty[] {
  const hasSecondaryLine =
    properties.includes("rewards") || properties.includes("description");

  if (hasSecondaryLine) return properties;

  const next = new Set<PartnerLinksDisplayProperty>(properties);
  next.add("link");
  next.add("rewards");

  return partnerLinksDisplayPropertyIds.filter((id) => next.has(id));
}
