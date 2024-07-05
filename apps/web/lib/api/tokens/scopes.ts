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
  "oauth_apps.read",
  "oauth_apps.write",
  "apis.all", // All API scopes
  "apis.read", // All read scopes
] as const;

export const resources = [
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
    name: "API Keys",
    key: "tokens",
    description: "Create, read, update, and delete API keys",
    betaFeature: false,
  },
  {
    name: "Conversions",
    key: "conversions",
    description: "Track conversions (customer, lead, sales)",
    betaFeature: true,
  },
  {
    name: "OAuth Apps",
    key: "oauth_apps",
    description: "Create, read, update, and delete OAuth apps",
    betaFeature: false,
  },
] as const;

export const permissions: Permission[] = [
  {
    permission: "Read",
    scope: "links.read",
    description: "Read access to links",
    roles: ["owner", "member"],
    resource: "links",
    betaFeature: false,
  },
  {
    permission: "Write",
    scope: "links.write",
    description: "Read and Write access to links",
    roles: ["owner", "member"],
    resource: "links",
    betaFeature: false,
  },
  {
    permission: "Read",
    scope: "analytics.read",
    description: "Read access to analytics and events",
    roles: ["owner", "member"],
    resource: "analytics",
    betaFeature: false,
  },
  {
    permission: "Read",
    scope: "workspaces.read",
    description: "Read access to workspace",
    roles: ["owner", "member"],
    resource: "workspaces",
    betaFeature: false,
  },
  {
    permission: "Write",
    scope: "workspaces.write",
    description: "Read and Write access to workspace",
    roles: ["owner"],
    resource: "workspaces",
    betaFeature: false,
  },
  {
    permission: "Read",
    scope: "domains.read",
    description: "Read access to domains",
    roles: ["owner", "member"],
    resource: "domains",
    betaFeature: false,
  },
  {
    permission: "Write",
    scope: "domains.write",
    description: "Read and Write access to domains",
    roles: ["owner"],
    resource: "domains",
    betaFeature: false,
  },
  {
    permission: "Read",
    scope: "tags.read",
    description: "Read access to tags",
    roles: ["owner", "member"],
    resource: "tags",
    betaFeature: false,
  },
  {
    permission: "Write",
    scope: "tags.write",
    description: "Read and Write access to tags",
    roles: ["owner", "member"],
    resource: "tags",
    betaFeature: false,
  },
  {
    permission: "Read",
    scope: "tokens.read",
    description: "Read access to Workspace API keys",
    roles: ["owner", "member"],
    resource: "tokens",
    betaFeature: false,
  },
  {
    permission: "Write",
    scope: "tokens.write",
    description: "Read and Write access to Workspace API keys",
    roles: ["owner", "member"],
    resource: "tokens",
    betaFeature: false,
  },
  {
    permission: "Write",
    scope: "conversions.write",
    description:
      "Read and Write access to conversions. Able to track customer, lead, and sales events",
    roles: ["owner"],
    resource: "conversions",
    betaFeature: true,
  },
  {
    permission: "Read",
    scope: "oauth_apps.read",
    description: "Read access to OAuth apps.",
    roles: ["owner", "member"],
    resource: "oauth_apps",
    betaFeature: false,
  },
  {
    permission: "Write",
    scope: "oauth_apps.write",
    description: "Read and Write access to OAuth apps.",
    roles: ["owner"],
    resource: "oauth_apps",
    betaFeature: false,
  },
];

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

export const permissionsByResource = permissions.reduce<
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

export const scopesByRole = permissions.reduce<Record<Role, Scope[]>>(
  (acc, permission) => {
    const { roles } = permission;

    roles.forEach((role) => {
      if (!acc[role]) {
        acc[role] = [];
      }

      acc[role].push(permission.scope);
    });

    return acc;
  },
  {} as Record<Role, Scope[]>,
);

// { links: 'links.read', tags: 'tags.read', ... }
export const mapScopeToResource = (scopes: string[]) => {
  const result = scopes.map((scope) => {
    const [resource] = scope.split(".");

    return {
      [resource]: scope,
    };
  });

  return Object.assign({}, ...result) as Record<Resource, Scope>;
};

export type Scope = (typeof availableScopes)[number];

type Resource = (typeof resources)[number]["key"];

type Permission = {
  permission: string;
  scope: Scope;
  description: string;
  roles: Role[];
  resource: Resource;
  betaFeature: boolean;
};

export type ResourceScopeMapping = Record<Resource, Scope>;
