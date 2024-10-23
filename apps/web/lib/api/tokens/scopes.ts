import { Role } from "@dub/prisma";
import { PermissionAction } from "../rbac/permissions";
import { ResourceKey } from "../rbac/resources";

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
  "conversions.write",
  "apis.all", // All API scopes
  "apis.read", // All read scopes
] as const;

export type Scope = (typeof SCOPES)[number];

// Scopes available for Workspace API keys
export const RESOURCE_SCOPES: {
  scope: Scope;
  roles: Role[];
  permissions: PermissionAction[];
  type?: "read" | "write";
  resource?: ResourceKey;
}[] = [
  {
    scope: "links.read",
    roles: ["owner", "member"],
    permissions: ["links.read"],
    type: "read",
    resource: "links",
  },
  {
    scope: "links.write",
    roles: ["owner", "member"],
    permissions: ["links.write", "links.read"],
    type: "write",
    resource: "links",
  },
  {
    scope: "tags.read",
    roles: ["owner", "member"],
    permissions: ["tags.read"],
    type: "read",
    resource: "tags",
  },
  {
    scope: "tags.write",
    roles: ["owner", "member"],
    permissions: ["tags.write", "tags.read"],
    type: "write",
    resource: "tags",
  },
  {
    scope: "domains.read",
    roles: ["owner", "member"],
    permissions: ["domains.read"],
    type: "read",
    resource: "domains",
  },
  {
    scope: "domains.write",
    roles: ["owner"],
    permissions: ["domains.write", "domains.read"],
    type: "write",
    resource: "domains",
  },
  {
    scope: "workspaces.read",
    roles: ["owner", "member"],
    permissions: ["workspaces.read"],
    type: "read",
    resource: "workspaces",
  },
  {
    scope: "workspaces.write",
    roles: ["owner"],
    permissions: ["workspaces.write", "workspaces.read"],
    type: "write",
    resource: "workspaces",
  },
  {
    scope: "analytics.read",
    roles: ["owner", "member"],
    permissions: ["analytics.read"],
    type: "read",
    resource: "analytics",
  },
  {
    scope: "conversions.write",
    roles: ["owner", "member"],
    permissions: ["conversions.write"],
    type: "write",
    resource: "conversions",
  },
  {
    scope: "apis.read",
    roles: ["owner", "member"],
    permissions: [
      "links.read",
      "tags.read",
      "domains.read",
      "workspaces.read",
      "analytics.read",
    ],
  },
  {
    scope: "apis.all",
    roles: ["owner", "member"],
    permissions: [
      "links.read",
      "links.write",
      "tags.read",
      "tags.write",
      "domains.read",
      "domains.write",
      "workspaces.read",
      "workspaces.write",
      "analytics.read",
      "conversions.write",
    ],
  },
];

export const SCOPES_BY_RESOURCE = RESOURCE_SCOPES.reduce((acc, scope) => {
  if (!scope.resource || !scope.type) {
    return acc;
  }

  if (!acc[scope.resource]) {
    acc[scope.resource] = [];
  }

  acc[scope.resource].push({
    scope: scope.scope,
    type: scope.type,
    roles: scope.roles,
  });

  return acc;
}, {});

// Scope to permissions mapping
export const SCOPE_PERMISSIONS_MAP = RESOURCE_SCOPES.reduce((acc, scope) => {
  acc[scope.scope] = scope.permissions;
  return acc;
}, {});

// Role to scopes mapping
export const ROLE_SCOPES_MAP = RESOURCE_SCOPES.reduce((acc, scope) => {
  scope.roles.forEach((role) => {
    if (!acc[role]) {
      acc[role] = [];
    }

    acc[role].push(scope.scope);
  });

  return acc;
}, {});

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

// Get SCOPES_BY_RESOURCE based on user role in a workspace
export const getScopesByResourceForRole = (role: Role) => {
  const groupedByResource = {};

  const allowedScopes = RESOURCE_SCOPES.map((scope) => {
    if (scope.roles.includes(role)) {
      return scope;
    }
  }).filter(Boolean);

  allowedScopes.forEach((scope) => {
    if (scope && scope.resource) {
      if (!groupedByResource[scope.resource]) {
        groupedByResource[scope.resource] = [];
      }

      groupedByResource[scope.resource].push(scope);
    }
  });

  return groupedByResource;
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

export const validateScopesForRole = (scopes: Scope[], role: Role) => {
  const allowedScopes = ROLE_SCOPES_MAP[role];
  const invalidScopes = scopes.filter(
    (scope) => !allowedScopes.includes(scope),
  );

  return !(invalidScopes.length > 0);
};
