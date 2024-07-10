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
      description: "Read access to links",
    },
    {
      type: "write",
      scope: "links.write",
      description: "Read and Write access to links",
    },
  ],
  analytics: [
    {
      type: "read",
      scope: "analytics.read",
      description: "Read access to analytics and events",
    },
  ],
  workspaces: [
    {
      type: "read",
      scope: "workspaces.read",
      description: "Read access to workspace",
    },
    {
      type: "write",
      scope: "workspaces.write",
      description: "Read and Write access to workspace",
    },
  ],
  domains: [
    {
      type: "read",
      scope: "domains.read",
      description: "Read access to domains",
    },
    {
      type: "write",
      scope: "domains.write",
      description: "Read and Write access to domains",
    },
  ],
  tags: [
    {
      type: "read",
      scope: "tags.read",
      description: "Read access to tags",
    },
    {
      type: "write",
      scope: "tags.write",
      description: "Read and Write access to tags",
    },
  ],
  tokens: [
    {
      type: "read",
      scope: "tokens.read",
      description: "Read access to Workspace API keys",
    },
    {
      type: "write",
      scope: "tokens.write",
      description: "Read and Write access to Workspace API keys",
    },
  ],
  conversions: [
    {
      type: "write",
      scope: "conversions.write",
      description:
        "Read and Write access to conversions. Able to track customer, lead, and sales events",
    },
  ],
};

export const PERMISSIONS: Permission[] = [
  {
    action: "links.read",
    scope: "links.read",
    roles: ["owner", "member"],
    resource: "links",
    betaFeature: false,
  },
  {
    action: "links.write",
    scope: "links.write",
    roles: ["owner", "member"],
    resource: "links",
    betaFeature: false,
  },
  {
    action: "analytics.read",
    scope: "analytics.read",
    roles: ["owner", "member"],
    resource: "analytics",
    betaFeature: false,
  },
  {
    action: "workspaces.read",
    scope: "workspaces.read",
    roles: ["owner", "member"],
    resource: "workspaces",
    betaFeature: false,
  },
  {
    action: "workspaces.write",
    scope: "workspaces.write",
    roles: ["owner"],
    resource: "workspaces",
    betaFeature: false,
  },
  {
    action: "domains.read",
    scope: "domains.read",
    roles: ["owner", "member"],
    resource: "domains",
    betaFeature: false,
  },
  {
    action: "domains.write",
    scope: "domains.write",
    roles: ["owner"],
    resource: "domains",
    betaFeature: false,
  },
  {
    action: "tags.read",
    scope: "tags.read",
    roles: ["owner", "member"],
    resource: "tags",
    betaFeature: false,
  },
  {
    action: "tags.write",
    scope: "tags.write",
    roles: ["owner", "member"],
    resource: "tags",
    betaFeature: false,
  },
  {
    action: "tokens.read",
    scope: "tokens.read",
    roles: ["owner", "member"],
    resource: "tokens",
    betaFeature: false,
  },
  {
    action: "tokens.write",
    scope: "tokens.write",
    roles: ["owner", "member"],
    resource: "tokens",
    betaFeature: false,
  },
  {
    action: "conversions.write",
    scope: "conversions.write",
    roles: ["owner"],
    resource: "conversions",
    betaFeature: true,
  },
];

// For each scope, get the permissions it grants access to and return array of permissions
export const mapScopesToPermissions = (scopes: Scope[]) => {
  const permissions: PermissionAction[] = [];

  scopes.forEach((scope) => {
    if (scope === "apis.all") {
      // Add all individual scopes to permissions
      permissions.push(
        ...SCOPES.filter((s) => s !== "apis.all" && s !== "apis.read").flatMap(
          (s) => PERMISSIONS.filter((p) => p.scope === s).map((p) => p.action),
        ),
      );
    } else if (scope === "apis.read") {
      // Add all read scopes to permissions
      permissions.push(
        ...SCOPES.filter((s) => s.endsWith(".read")).flatMap((s) =>
          PERMISSIONS.filter((p) => p.scope === s).map((p) => p.action),
        ),
      );
    } else {
      // Add the scope as is
      permissions.push(
        ...PERMISSIONS.filter((permission) => permission.scope === scope).map(
          (permission) => permission.action,
        ),
      );
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
  const allowedResources: string[] = [];

  // Filter permissions by the role
  const allowedPermissions = PERMISSIONS.filter((permission) =>
    permission.roles.includes(role),
  );

  // Get resources allowed by permissions
  allowedPermissions.forEach((permission) => {
    if (!allowedResources.includes(permission.resource)) {
      allowedResources.push(permission.resource);
    }
  });

  // Filter SCOPES_BY_RESOURCE based on allowed resources and scopes
  // @ts-ignore
  const scopedResources: ScopeByResource = {};
  allowedResources.forEach((resource) => {
    scopedResources[resource] = SCOPES_BY_RESOURCE[resource].filter((scope) =>
      allowedPermissions.some(
        (permission) =>
          permission.scope === scope.scope && permission.resource === resource,
      ),
    );
  });

  return scopedResources;
};

// Get scopes by role
export const getScopesByRole = (role: Role) => {
  const permissions = getPermissionsByRole(role);

  const scopes = PERMISSIONS.filter((p) => permissions.includes(p.action)).map(
    (permission) => permission.scope,
  );

  scopes.push("apis.read", "apis.all");

  return scopes;
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
  scope: Scope;
  roles: Role[];
  resource: ResourceKeys;
  betaFeature: boolean;
};

export type ScopeByResource = {
  [key in ResourceKeys]: {
    scope: Scope;
    type: "read" | "write";
    description: string;
  }[];
};
