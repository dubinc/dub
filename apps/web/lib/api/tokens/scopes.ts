import { Role } from "@prisma/client";

export const scopes = [
  // Workspaces
  "workspaces.read",

  // Links
  "links.read",
  "links.write",

  // Tags
  "tags.read",
  "tags.write",

  // Analytics
  "analytics.read",

  // Domains
  "domains.read",
  "domains.write",
] as const;

export const scopeDescriptions = [
  {
    name: "Workspaces",
    description: "Read workspaces",
    endpoints: ["/workspaces"],
    permissions: [
      {
        scope: "workspaces.read",
        description: "Read workspaces",
      },
    ],
  },
  {
    name: "Links",
    description: "Create, read, update, and delete links",
    endpoints: ["/links"],
    permissions: [
      {
        scope: "links.read",
        description: "Read links",
      },
      {
        scope: "links.write",
        description: "Write links",
      },
    ],
  },
  {
    name: "Tags",
    description: "Create, read, update, and delete tags",
    endpoints: ["/tags"],
    permissions: [
      {
        scope: "tags.read",
        description: "Read tags",
      },
      {
        scope: "tags.write",
        description: "Write tags",
      },
    ],
  },
  {
    name: "Analytics",
    description: "Read analytics",
    endpoints: ["/analytics"],
    permissions: [
      {
        scope: "analytics.read",
        description: "Read analytics",
      },
    ],
  },
  {
    name: "Domains",
    description: "Create, read, update, and delete domains",
    endpoints: ["/domains"],
    permissions: [
      {
        scope: "domains.read",
        description: "Read domains",
      },
      {
        scope: "domains.write",
        description: "Write domains",
      },
    ],
  },
] as const;

export const roleToScopes: Record<Role, Scope[]> = {
  owner: [
    "workspaces.read",
    "links.read",
    "links.write",
    "tags.read",
    "tags.write",
    "analytics.read",
    "domains.read",
    "domains.write",
  ],
  member: [
    "workspaces.read",
    "links.read",
    "tags.read",
    "analytics.read",
    "domains.read",
  ],
} as const;

export type Scope = (typeof scopes)[number];
