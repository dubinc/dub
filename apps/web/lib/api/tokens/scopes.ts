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
  "oauth_clients.write",
  "oauth_clients.read",
  "apis.all", // All API scopes
  "apis.read", // All read scopes
] as const;

export type Scope = (typeof availableScopes)[number];

type Resource =
  | "links"
  | "analytics"
  | "workspaces"
  | "domains"
  | "tags"
  | "tokens"
  | "conversions"
  | "oauth_clients";

type Permission = {
  permission: string;
  scope: Scope;
  description: string;
  roles: Role[];
  resource: Resource;
};

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
  {
    name: "OAuth Apps",
    key: "oauth_clients",
    description: "OAuth apps (create, read, update, delete)",
    betaFeature: true,
    permissions: [
      {
        permission: "Read",
        scope: "oauth_clients.read",
        description: "Read OAuth apps",
        roles: ["owner", "member"],
      },
      {
        permission: "Write",
        scope: "oauth_clients.write",
        description: "Create, update, and delete OAuth apps",
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
  "tokens.write": ["tokens.write", "tokens.read"],
  "oauth_apps.write": ["oauth_apps.write", "oauth_apps.read"],
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

export const permissions: Permission[] = [
  {
    permission: "Read",
    scope: "links.read",
    description: "Read access to links",
    roles: ["owner", "member"],
    resource: "links",
  },
  {
    permission: "Write",
    scope: "links.write",
    description: "Read and Write access to links",
    roles: ["owner", "member"],
    resource: "links",
  },
  {
    permission: "Read",
    scope: "analytics.read",
    description: "Read access to analytics and events",
    roles: ["owner", "member"],
    resource: "analytics",
  },
  {
    permission: "Read",
    scope: "workspaces.read",
    description: "Read access to workspace",
    roles: ["owner", "member"],
    resource: "workspaces",
  },
  {
    permission: "Write",
    scope: "workspaces.write",
    description: "Read and Write access to workspace",
    roles: ["owner"],
    resource: "workspaces",
  },
  {
    permission: "Read",
    scope: "domains.read",
    description: "Read access to domains",
    roles: ["owner", "member"],
    resource: "domains",
  },
  {
    permission: "Write",
    scope: "domains.write",
    description: "Read and Write access to domains",
    roles: ["owner"],
    resource: "domains",
  },
  {
    permission: "Read",
    scope: "tags.read",
    description: "Read access to tags",
    roles: ["owner", "member"],
    resource: "tags",
  },
  {
    permission: "Write",
    scope: "tags.write",
    description: "Read and Write access to tags",
    roles: ["owner", "member"],
    resource: "tags",
  },
  {
    permission: "Read",
    scope: "tokens.read",
    description: "Read access to Workspace API keys",
    roles: ["owner", "member"],
    resource: "tokens",
  },
  {
    permission: "Write",
    scope: "tokens.write",
    description: "Read and Write access to Workspace API keys",
    roles: ["owner", "member"],
    resource: "tokens",
  },
  {
    permission: "Write",
    scope: "conversions.write",
    description:
      "Read and Write access to conversions. Able to track customer, lead, and sales events",
    roles: ["owner"],
    resource: "conversions",
  },
  {
    permission: "Read",
    scope: "oauth_clients.read",
    description: "Read access to OAuth clients",
    roles: ["owner", "member"],
    resource: "oauth_clients",
  },
  {
    permission: "Write",
    scope: "oauth_clients.write",
    description: "Read and Write access to OAuth clients",
    roles: ["owner"],
    resource: "oauth_clients",
  },
];

export const scopesByResource = permissions.reduce<
  Record<Resource, Permission[]>
>(
  (acc, permission) => {
    const { resource } = permission;

    if (!acc[resource]) {
      acc[resource] = [];
    }

    acc[resource].push(permission);

    return acc;
  },
  {} as Record<Resource, Permission[]>,
);
