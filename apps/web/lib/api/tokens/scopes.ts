import { Role } from "@prisma/client";

export const scopes = [
  // Workspaces
  "workspaces.read",
  "workspaces.write",

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

  // API tokens
  "tokens.read",
  "tokens.write",
] as const;

export type Scope = (typeof scopes)[number];

interface ScopeDescription {
  name: string;
  description: string;
  endpoints: string[];
  permissions: {
    scope: Scope;
    description: string;
    roles: Role[];
  }[];
}

export const scopeDescriptions = [
  {
    name: "Workspaces",
    description: "Read workspaces",
    endpoints: ["/workspaces"],
    permissions: [
      {
        scope: "workspaces.read",
        description: "Read workspaces",
        roles: ["owner", "member"],
      },
      {
        scope: "workspaces.write",
        description: "Write workspaces",
        roles: ["owner"],
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
        roles: ["owner", "member"],
      },
      {
        scope: "links.write",
        description: "Write links",
        roles: ["owner", "member"],
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
        roles: ["owner", "member"],
      },
      {
        scope: "tags.write",
        description: "Write tags",
        roles: ["owner", "member"],
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
        roles: ["owner", "member"],
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
        roles: ["owner", "member"],
      },
      {
        scope: "domains.write",
        description: "Write domains",
        roles: ["owner"],
      },
    ],
  },
] as const;

// Map roles to scopes
// { owner: ["workspace.write"], member: ["workspace.read"] }
export const roleToScopes = scopeDescriptions.reduce<Record<Role, Scope[]>>(
  (acc, { permissions }) => {
    permissions.forEach(({ scope, roles }) => {
      roles.forEach((role) => {
        if (!acc[role]) {
          acc[role] = [];
        }

        acc[role].push(scope);
      });
    });

    return acc;
  },
  {} as Record<Role, Scope[]>,
);
