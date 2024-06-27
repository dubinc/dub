import { Role } from "@prisma/client";

export const availableScopes = [
  "workspaces.read",
  "workspaces.write",
  "links.read",
  "links.write",
  "tags.read",
  "tags.write",
  "analytics.read",
  "domains.read",
  "domains.write",
  "tokens.read",
  "tokens.write",
  "conversions.write",
] as const;

export type Scope = (typeof availableScopes)[number];

export const resourcePermissions = [
  {
    name: "Workspaces",
    key: "workspaces",
    description: "Read, update, and delete workspaces",
    betaFeature: false,
    permissions: [
      {
        permission: "Read",
        scope: "workspaces.read",
        description: "Read workspaces",
        roles: ["owner", "member"],
      },
      {
        permission: "Write",
        scope: "workspaces.write",
        description: "Update and delete workspaces",
        roles: ["owner"],
      },
    ],
  },
  {
    name: "Links",
    key: "links",
    description: "Create, read, update, and delete links",
    betaFeature: false,
    permissions: [
      {
        permission: "Read",
        scope: "links.read",
        description: "Read links",
        roles: ["owner", "member"],
      },
      {
        permission: "Write",
        scope: "links.write",
        description: "Update and delete links",
        roles: ["owner", "member"],
      },
    ],
  },
  {
    name: "Tags",
    key: "tags",
    description: "Create, read, update, and delete tags",
    betaFeature: false,
    permissions: [
      {
        permission: "Read",
        scope: "tags.read",
        description: "Read tags",
        roles: ["owner", "member"],
      },
      {
        permission: "Write",
        scope: "tags.write",
        description: "Update and delete tags",
        roles: ["owner", "member"],
      },
    ],
  },
  {
    name: "Domains",
    key: "domains",
    description: "Create, read, update, and delete domains",
    betaFeature: false,
    permissions: [
      {
        permission: "Read",
        scope: "domains.read",
        description: "Read domains",
        roles: ["owner", "member"],
      },
      {
        permission: "Write",
        scope: "domains.write",
        description: "Update and delete domains",
        roles: ["owner"],
      },
    ],
  },
  {
    name: "API Keys",
    key: "tokens",
    description: "Create, read, update, and delete API keys",
    betaFeature: false,
    permissions: [
      {
        permission: "Read",
        scope: "tokens.read",
        description: "Read tokens",
        roles: ["owner", "member"],
      },
      {
        permission: "Write",
        scope: "tokens.write",
        description: "Update and delete tokens",
        roles: ["owner", "member"],
      },
    ],
  },
  {
    name: "Analytics",
    key: "analytics",
    description: "Read analytics",
    betaFeature: false,
    permissions: [
      {
        permission: "Read",
        scope: "analytics.read",
        description: "Read analytics and events",
        roles: ["owner", "member"],
      },
    ],
  },
  {
    name: "Conversions",
    key: "conversions",
    description: "Track conversions (customer, lead, sales)",
    betaFeature: true,
    permissions: [
      {
        permission: "Write",
        scope: "conversions.write",
        description: "Track customer, lead, and sales events",
        roles: ["owner"],
      },
    ],
  },
] as const;

// Map roles to scopes
// { owner: ["workspace.write"], member: ["workspace.read"] }
export const roleScopesMapping = resourcePermissions.reduce<
  Record<Role, Scope[]>
>(
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

export const scopeMapping = {
  "workspaces.write": ["workspaces.write", "workspaces.read"],
  "links.write": ["links.write", "links.read"],
  "tags.write": ["tags.write", "tags.read"],
  "domains.write": ["domains.write", "domains.read"],
};
