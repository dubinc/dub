export const RESOURCE_KEYS = [
  "links",
  "workspaces",
  "analytics",
  "domains",
  "tags",
  "tokens",
  "conversions",
  "webhooks",
] as const;

export const RESOURCES: {
  name: string;
  key: ResourceKey;
  description: string;
  betaFeature: boolean;
}[] = [
  {
    name: "Links",
    key: "links",
    description: "Create, read, update, and delete links",
    betaFeature: false,
  },
  {
    name: "Analytics",
    key: "analytics",
    description: "Read analytics",
    betaFeature: false,
  },
  {
    name: "Workspaces",
    key: "workspaces",
    description: "Read, update, and delete workspaces",
    betaFeature: false,
  },
  {
    name: "Domains",
    key: "domains",
    description: "Create, read, update, and delete domains",
    betaFeature: false,
  },
  {
    name: "Tags",
    key: "tags",
    description: "Create, read, update, and delete tags",
    betaFeature: false,
  },
  {
    name: "Conversions",
    key: "conversions",
    description: "Track conversions (customer, lead, sales)",
    betaFeature: true,
  },
  {
    name: "Webhooks",
    key: "webhooks",
    description: "Create, read, update, and delete webhooks",
    betaFeature: true,
  },
];

export type ResourceKey = (typeof RESOURCE_KEYS)[number];
