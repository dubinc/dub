export const RESOURCE_KEYS = [
  "links",
  "workspaces",
  "analytics",
  "domains",
  "tags",
  "folders",
  "tokens",
  "webhooks",
] as const;

export type ResourceKey = (typeof RESOURCE_KEYS)[number];

export const RESOURCES: {
  name: string;
  key: ResourceKey;
  description: string;
}[] = [
  {
    name: "Links",
    key: "links",
    description: "Create, read, update, and delete links",
  },
  {
    name: "Analytics",
    key: "analytics",
    description: "Create and read analytics events",
  },
  {
    name: "Workspaces",
    key: "workspaces",
    description: "Read, update, and delete workspaces",
  },
  {
    name: "Domains",
    key: "domains",
    description: "Create, read, update, and delete domains",
  },
  {
    name: "Tags",
    key: "tags",
    description: "Create, read, update, and delete tags",
  },
  {
    name: "Folders",
    key: "folders",
    description: "Create, read, update, and delete folders",
  },
];
