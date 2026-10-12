const RESOURCE_KEYS = [
  "links",
  "workspaces",
  "analytics",
  "domains",
  "tags",
  "folders",
  "tokens",
  "webhooks",
  "groups",
  "partners",
  "program_applications",
  "customers",
  "discount_codes",
  "commissions",
  "bounties",
  "payouts",
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
  {
    name: "Partner groups",
    key: "groups",
    description: "Create, read, update, and delete partner groups",
  },
  {
    name: "Partners",
    key: "partners",
    description: "Create, read, update, and delete partners",
  },
  {
    name: "Program applications",
    key: "program_applications",
    description: "List, approve, and reject program applications",
  },
  {
    name: "Customers",
    key: "customers",
    description: "Create, read, update, and delete customers",
  },
  {
    name: "Discount codes",
    key: "discount_codes",
    description: "Create, read, and delete discount codes",
  },
  {
    name: "Commissions",
    key: "commissions",
    description: "Create, read, and update commissions",
  },
  {
    name: "Bounties",
    key: "bounties",
    description: "List, approve, and reject bounty submissions",
  },
  {
    name: "Payouts",
    key: "payouts",
    description: "Read and confirm payouts",
  },
];
