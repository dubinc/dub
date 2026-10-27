import { WorkspaceRole } from "@prisma/client";
import { PermissionAction } from "../rbac/permissions";
import { ResourceKey } from "../rbac/resources";

export const SCOPES = [
  "links.read",
  "links.write",
  "tags.read",
  "tags.write",
  "folders.read",
  "folders.write",
  "analytics.read",
  "domains.read",
  "domains.write",
  "workspaces.read",
  "workspaces.write",
  "webhooks.read",
  "webhooks.write",
  "groups.read",
  "groups.write",
  "partners.read",
  "partners.write",
  "program_applications.read",
  "program_applications.write",
  "customers.read",
  "customers.write",
  "discount_codes.read",
  "discount_codes.write",
  "commissions.read",
  "commissions.write",
  "bounties.read",
  "bounties.write",
  "payouts.read",
  "apis.all", // All API scopes
  "apis.read", // All read scopes
] as const;

export type Scope = (typeof SCOPES)[number];

// Scopes available for Workspace API keys
const RESOURCE_SCOPES: {
  scope: Scope;
  roles: WorkspaceRole[];
  permissions: PermissionAction[];
  type?: "read" | "write";
  resource?: ResourceKey;
}[] = [
  {
    scope: "links.read",
    roles: ["owner", "member", "viewer", "billing"],
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
    roles: ["owner", "member", "viewer", "billing"],
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
    scope: "folders.read",
    roles: ["owner", "member", "viewer", "billing"],
    permissions: ["folders.read"],
    type: "read",
    resource: "folders",
  },
  {
    scope: "folders.write",
    roles: ["owner", "member"],
    permissions: ["folders.write", "folders.read"],
    type: "write",
    resource: "folders",
  },
  {
    scope: "domains.read",
    roles: ["owner", "member", "viewer", "billing"],
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
    scope: "groups.read",
    roles: ["owner", "member", "viewer", "billing"],
    permissions: ["groups.read"],
    type: "read",
    resource: "groups",
  },
  {
    scope: "groups.write",
    roles: ["owner", "member"],
    permissions: ["groups.write", "groups.read"],
    type: "write",
    resource: "groups",
  },
  {
    scope: "partners.read",
    roles: ["owner", "member", "viewer", "billing"],
    permissions: ["partners.read"],
    type: "read",
    resource: "partners",
  },
  {
    scope: "partners.write",
    roles: ["owner", "member"],
    permissions: ["partners.write", "partners.read"],
    type: "write",
    resource: "partners",
  },
  {
    scope: "program_applications.read",
    roles: ["owner", "member", "viewer", "billing"],
    permissions: ["program_applications.read"],
    type: "read",
    resource: "program_applications",
  },
  {
    scope: "program_applications.write",
    roles: ["owner", "member"],
    permissions: ["program_applications.write", "program_applications.read"],
    type: "write",
    resource: "program_applications",
  },
  {
    scope: "customers.read",
    roles: ["owner", "member", "viewer", "billing"],
    permissions: ["customers.read"],
    type: "read",
    resource: "customers",
  },
  {
    scope: "customers.write",
    roles: ["owner", "member"],
    permissions: ["customers.write", "customers.read"],
    type: "write",
    resource: "customers",
  },
  {
    scope: "discount_codes.read",
    roles: ["owner", "member", "viewer", "billing"],
    permissions: ["discount_codes.read"],
    type: "read",
    resource: "discount_codes",
  },
  {
    scope: "discount_codes.write",
    roles: ["owner", "member"],
    permissions: ["discount_codes.write", "discount_codes.read"],
    type: "write",
    resource: "discount_codes",
  },
  {
    scope: "commissions.read",
    roles: ["owner", "member", "viewer", "billing"],
    permissions: ["commissions.read"],
    type: "read",
    resource: "commissions",
  },
  {
    scope: "commissions.write",
    roles: ["owner", "member"],
    permissions: ["commissions.write", "commissions.read"],
    type: "write",
    resource: "commissions",
  },
  {
    scope: "bounties.read",
    roles: ["owner", "member", "viewer", "billing"],
    permissions: ["bounties.read"],
    type: "read",
    resource: "bounties",
  },
  {
    scope: "bounties.write",
    roles: ["owner", "member"],
    permissions: ["bounties.write", "bounties.read"],
    type: "write",
    resource: "bounties",
  },
  {
    scope: "payouts.read",
    roles: ["owner", "member", "viewer", "billing"],
    permissions: ["payouts.read"],
    type: "read",
    resource: "payouts",
  },
  {
    scope: "workspaces.read",
    roles: ["owner", "member", "viewer", "billing"],
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
    roles: ["owner", "member", "viewer", "billing"],
    permissions: ["analytics.read"],
    type: "read",
    resource: "analytics",
  },
  {
    scope: "webhooks.read",
    roles: ["owner", "member", "viewer", "billing"],
    permissions: ["webhooks.read"],
    type: "read",
    resource: "webhooks",
  },
  {
    scope: "webhooks.write",
    roles: ["owner"],
    permissions: ["webhooks.write", "webhooks.read"],
    type: "write",
    resource: "webhooks",
  },
  {
    scope: "apis.read",
    roles: ["owner", "member", "viewer", "billing"],
    permissions: [
      "links.read",
      "tags.read",
      "folders.read",
      "domains.read",
      "workspaces.read",
      "analytics.read",
      "groups.read",
      "partners.read",
      "program_applications.read",
      "customers.read",
      "discount_codes.read",
      "commissions.read",
      "bounties.read",
      "payouts.read",
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
      "folders.read",
      "folders.write",
      "domains.read",
      "domains.write",
      "workspaces.read",
      "workspaces.write",
      "analytics.read",
      "groups.read",
      "groups.write",
      "partners.read",
      "partners.write",
      "program_applications.read",
      "program_applications.write",
      "customers.read",
      "customers.write",
      "discount_codes.read",
      "discount_codes.write",
      "commissions.read",
      "commissions.write",
      "bounties.read",
      "bounties.write",
      "payouts.read",
    ],
  },
];

export type LegacyScopeGrant = {
  enforcedAt: Date;
  permissions: readonly PermissionAction[];
};

// Keys and OAuth installations created before this date were made before the
// partner program scopes existed.
export const PARTNER_SCOPES_ENFORCED_AT = new Date("2026-10-13T18:35:00.000Z");

// Scopes introduced after API keys already existed. A key or OAuth installation
// created before `enforcedAt` keeps these permissions without selecting the scope.
// Keep permissions that share a cutoff in one entry. Add a new entry when a
// scope needs a different cutoff.
export const LEGACY_SCOPE_GRANTS: LegacyScopeGrant[] = [
  {
    enforcedAt: PARTNER_SCOPES_ENFORCED_AT,
    permissions: [
      "partners.read",
      "partners.write",
      "program_applications.read",
      "program_applications.write",
      "customers.read",
      "customers.write",
      "discount_codes.read",
      "discount_codes.write",
      "commissions.read",
      "commissions.write",
      "bounties.read",
      "bounties.write",
      "payouts.read",
    ],
  },
];

// Scope to permissions mapping
const SCOPE_PERMISSIONS_MAP = RESOURCE_SCOPES.reduce((acc, scope) => {
  acc[scope.scope] = scope.permissions;
  return acc;
}, {});

// WorkspaceRole to scopes mapping
const ROLE_SCOPES_MAP = RESOURCE_SCOPES.reduce((acc, scope) => {
  scope.roles.forEach((role) => {
    if (!acc[role]) {
      acc[role] = [];
    }

    acc[role].push(scope.scope);
  });

  return acc;
}, {});

// For each scope, get the permissions it grants access to and return array of permissions
export const mapScopesToPermissions = (scopes: Scope[]) => {
  const permissions: PermissionAction[] = [];

  scopes.forEach((scope) => {
    if (SCOPE_PERMISSIONS_MAP[scope]) {
      permissions.push(...SCOPE_PERMISSIONS_MAP[scope]);
    }
  });

  return permissions;
};

// Grants permissions from `grants` when the key or installation predates the
// grant's cutoff. A missing date is treated as legacy so cached tokens from
// before this field existed keep working. Routes can pass extra grants that
// apply only to that route.
export const grantLegacyScopePermissions = ({
  permissions,
  createdAt,
  grants = LEGACY_SCOPE_GRANTS,
}: {
  permissions: PermissionAction[];
  createdAt?: Date | string | null;
  grants?: readonly LegacyScopeGrant[];
}): PermissionAction[] => {
  const createdAtMs = createdAt == null ? null : new Date(createdAt).getTime();

  const legacyPermissions = grants.flatMap((grant) =>
    createdAtMs != null && createdAtMs >= grant.enforcedAt.getTime()
      ? []
      : grant.permissions,
  );

  if (legacyPermissions.length === 0) {
    return permissions;
  }

  return [...new Set<PermissionAction>([...permissions, ...legacyPermissions])];
};

// True when the legacy grant gives a key permissions that its own scopes do
// not include, so the key has more access than the dashboard shows. "All
// access" keys already have every permission and return false.
export const hasLegacyScopeGrant = ({
  scopes,
  createdAt,
}: {
  scopes: string[];
  createdAt: Date | string;
}) => {
  const permissions = new Set(mapScopesToPermissions(scopes as Scope[]));

  return (
    new Set(
      grantLegacyScopePermissions({ permissions: [...permissions], createdAt }),
    ).size > permissions.size
  );
};

// Get SCOPES_BY_RESOURCE based on user role in a workspace
export const getScopesByResourceForRole = (role: WorkspaceRole) => {
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

export const validateScopesForRole = (scopes: Scope[], role: WorkspaceRole) => {
  const allowedScopes = ROLE_SCOPES_MAP[role];
  const invalidScopes = scopes.filter(
    (scope) => !allowedScopes.includes(scope),
  );

  return !(invalidScopes.length > 0);
};

// Get the scopes for a role
const getScopesForRole = (role: WorkspaceRole) => {
  return ROLE_SCOPES_MAP[role];
};

// Consolidate scopes to avoid duplication and show only the most permissive scope
const consolidateScopes = (scopes: string[]) => {
  const consolidated = new Set();

  scopes.forEach((scope) => {
    const [resource, action] = scope.split(".");

    if (action === "write") {
      consolidated.add(`${resource}.write`);
    } else if (action === "read" && !consolidated.has(`${resource}.write`)) {
      consolidated.add(`${resource}.read`);
    }
  });

  return Array.from(consolidated) as string[];
};

const isScopeGrantedForRole = ({
  scope,
  role,
}: {
  scope: string;
  role: WorkspaceRole;
}) => {
  const scopesForRole: string[] = getScopesForRole(role) ?? [];

  return scope === "user.read" || scopesForRole.includes(scope);
};

// Scopes that can be granted for the given role (intersection with requested)
export const getGrantedScopesForRole = ({
  scopes,
  role,
}: {
  scopes: string[];
  role: WorkspaceRole;
}) => {
  return scopes.filter((scope) =>
    isScopeGrantedForRole({
      scope,
      role,
    }),
  );
};

// Requested scopes the role cannot grant (raw intersection, same basis as grant)
export const getMissingScopesForRole = ({
  scopes,
  role,
}: {
  scopes: string[];
  role: WorkspaceRole;
}) => {
  return scopes.filter((scope) => !isScopeGrantedForRole({ scope, role }));
};

// Consent rows: consolidate granted and missing separately so a granted
// `{resource}.read` is still shown when `{resource}.write` is denied.
export const getDisplayedScopesForRole = ({
  scopes,
  role,
}: {
  scopes: string[];
  role: WorkspaceRole;
}) => {
  const grantedScopes = consolidateScopes(
    getGrantedScopesForRole({ scopes, role }),
  );

  const missingScopes = consolidateScopes(
    getMissingScopesForRole({ scopes, role }),
  );

  const order = new Map(scopes.map((scope, index) => [scope, index]));

  return [
    ...grantedScopes.map((scope) => ({ scope, missing: false })),
    ...missingScopes.map((scope) => ({ scope, missing: true })),
  ].sort(
    (a, b) =>
      (order.get(a.scope) ?? Infinity) - (order.get(b.scope) ?? Infinity),
  );
};
