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
  "apis.all", // All API scopes
  "apis.read", // All read scopes
] as const;

export type Scope = (typeof availableScopes)[number];

export const resourcePermissions = [
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
  "apis.all": availableScopes,
  "apis.read": availableScopes.filter((scope) => scope.endsWith(".read")),
  "workspaces.write": ["workspaces.write", "workspaces.read"],
  "links.write": ["links.write", "links.read"],
  "tags.write": ["tags.write", "tags.read"],
  "domains.write": ["domains.write", "domains.read"],
};

export const scopePresets = [
  {
    value: "all_access",
    label: "All",
    description: "full access to all resources",
  },
  {
    value: "read_only",
    label: "Read Only",
    description: "read-only access to all resources",
  },
  {
    value: "restricted",
    label: "Restricted",
    description: "restricted access to some resources",
  },
];

export const scopesToName = (scopes: string[]) => {
  if (scopes.includes("apis.all")) {
    return {
      name: "All access",
      description: "full access to all resources",
    };
  }
  if (scopes.includes("apis.read")) {
    return {
      name: "Read-only",
      description: "read-only access to all resources",
    };
  }
  return {
    name: "Restricted",
    description: "restricted access to some resources",
  };
};
