import { Role } from "@prisma/client";

export const SCOPES = [
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

export const PERMISSION_ACTIONS = [
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

export const RESOURCES: Resource[] = [
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
];

export const SCOPES_BY_RESOURCE: ScopeByResource = {
  links: [
    {
      type: "read",
      scope: "links.read",
    },
    {
      type: "write",
      scope: "links.write",
    },
  ],
  analytics: [
    {
      type: "read",
      scope: "analytics.read",
    },
  ],
  workspaces: [
    {
      type: "read",
      scope: "workspaces.read",
    },
    {
      type: "write",
      scope: "workspaces.write",
    },
  ],
  domains: [
    {
      type: "read",
      scope: "domains.read",
    },
    {
      type: "write",
      scope: "domains.write",
    },
  ],
  tags: [
    {
      type: "read",
      scope: "tags.read",
    },
    {
      type: "write",
      scope: "tags.write",
    },
  ],
  tokens: [
    {
      type: "read",
      scope: "tokens.read",
    },
    {
      type: "write",
      scope: "tokens.write",
    },
  ],
  conversions: [
    {
      type: "write",
      scope: "conversions.write",
    },
  ],
};

export const PERMISSIONS: Permission[] = [
  {
    action: "links.read",
    roles: ["owner", "member"],
    resource: "links",
    betaFeature: false,
  },
  {
    action: "links.write",
    roles: ["owner", "member"],
    resource: "links",
    betaFeature: false,
  },
  {
    action: "analytics.read",
    roles: ["owner", "member"],
    resource: "analytics",
    betaFeature: false,
  },
  {
    action: "workspaces.read",
    roles: ["owner", "member"],
    resource: "workspaces",
    betaFeature: false,
  },
  {
    action: "workspaces.write",
    roles: ["owner"],
    resource: "workspaces",
    betaFeature: false,
  },
  {
    action: "domains.read",
    roles: ["owner", "member"],
    resource: "domains",
    betaFeature: false,
  },
  {
    action: "domains.write",
    roles: ["owner"],
    resource: "domains",
    betaFeature: false,
  },
  {
    action: "tags.read",
    roles: ["owner", "member"],
    resource: "tags",
    betaFeature: false,
  },
  {
    action: "tags.write",
    roles: ["owner", "member"],
    resource: "tags",
    betaFeature: false,
  },
  {
    action: "tokens.read",
    roles: ["owner", "member"],
    resource: "tokens",
    betaFeature: false,
  },
  {
    action: "tokens.write",
    roles: ["owner", "member"],
    resource: "tokens",
    betaFeature: false,
  },
  {
    action: "conversions.write",
    roles: ["owner"],
    resource: "conversions",
    betaFeature: true,
  },
];

// Scope to permission mapping
export const SCOPE_PERMISSIONS_MAP: Record<Scope, PermissionAction[]> = {
  "links.read": ["links.read"],
  "links.write": ["links.write", "links.read"],
  "tags.read": ["tags.read"],
  "tags.write": ["tags.write", "tags.read"],
  "analytics.read": ["analytics.read"],
  "workspaces.read": ["workspaces.read"],
  "workspaces.write": ["workspaces.write", "workspaces.read"],
  "domains.read": ["domains.read"],
  "domains.write": ["domains.write", "domains.read"],
  "tokens.read": ["tokens.read"],
  "tokens.write": ["tokens.write", "tokens.read"],
  "conversions.write": ["conversions.write"],
  "apis.all": PERMISSION_ACTIONS.map((action) => action),
  "apis.read": PERMISSION_ACTIONS.filter((action) => action.endsWith(".read")),
};

// Role to scopes mapping
export const ROLE_SCOPES_MAP: Record<Role, Scope[]> = {
  owner: [
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
    "apis.all",
    "apis.read",
  ],
  member: [
    "workspaces.read",
    "links.read",
    "links.write",
    "tags.read",
    "tags.write",
    "analytics.read",
    "domains.read",
    "tokens.read",
    "tokens.write",
    "apis.read",
    "apis.all",
  ],
};

// // For each scope, get the permissions it grants access to and return array of permissions
export const mapScopesToPermissions = (scopes: Scope[]) => {
  const permissions: PermissionAction[] = [];

  scopes.forEach((scope) => {
    if (SCOPE_PERMISSIONS_MAP[scope]) {
      permissions.push(...SCOPE_PERMISSIONS_MAP[scope]);
    }
  });

  return permissions;
};

// Get permissions by roles
export const getPermissionsByRole = (role: Role) => {
  return PERMISSIONS.filter((permission) =>
    permission.roles.includes(role),
  ).map((permission) => permission.action);
};

// Get SCOPES_BY_RESOURCE based on user role in a workspace
export const getScopesByResourceForRole = (role: Role) => {
  const allowedScopes = ROLE_SCOPES_MAP[role];
  // @ts-ignore
  const scopedResources: ScopeByResource = {};

  Object.keys(SCOPES_BY_RESOURCE).forEach((resourceKey) => {
    SCOPES_BY_RESOURCE[resourceKey].forEach((scope) => {
      if (allowedScopes.includes(scope.scope)) {
        if (!scopedResources[resourceKey]) {
          scopedResources[resourceKey] = [];
        }

        scopedResources[resourceKey].push(scope);
      }
    });
  });

  return scopedResources;
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

export type Scope = (typeof SCOPES)[number];

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export type ResourceKeys =
  | "links"
  | "workspaces"
  | "analytics"
  | "domains"
  | "tags"
  | "tokens"
  | "conversions";

type Resource = {
  name: string;
  key: ResourceKeys;
  description: string;
  betaFeature: boolean;
};

type Permission = {
  action: PermissionAction;
  roles: Role[];
  resource: ResourceKeys;
  betaFeature: boolean;
};

export type ScopeByResource = {
  [key in ResourceKeys]: {
    scope: Scope;
    type: "read" | "write";
  }[];
};
