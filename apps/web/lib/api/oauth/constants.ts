// OAuth configuration
export const OAUTH_CONFIG = {
  ACCESS_TOKEN_LIFETIME: 2 * 60 * 60, // 2 hours
  REFRESH_TOKEN_LIFETIME: 60 * 24 * 60 * 60, // 60 days
  CODE_LIFETIME: 2 * 60, // 2 minutes

  CLIENT_ID_LENGTH: 24,
  CLIENT_SECRET_LENGTH: 30,
  ACCESS_TOKEN_LENGTH: 40,
  REFRESH_TOKEN_LENGTH: 40,
  CODE_LENGTH: 40,

  // TODO:
  // Keep it short and simple (Discuss with Steven)
  CLIENT_SECRET_PREFIX: "dub_app_secret_",
};

// These are the scopes an OAuth app can request on behalf of an user
// Keep it separate from the actual scopes to avoid confusion
// We don't want all the scopes to be requested by an app
export const OAUTH_SCOPES = [
  "workspaces.read",
  "workspaces.write",
  "links.read",
  "links.write",
  "tags.read",
  "tags.write",
  "analytics.read",
  "domains.read",
  "domains.write",
  "user.read", // default scope, no need to request it
];

// Scope descriptions
export const OAUTH_SCOPE_DESCRIPTIONS = {
  "workspaces.read": "Read access to workspace",
  "workspaces.write": "Read and Write access to workspace",
  "links.read": "Read access to links",
  "links.write": "Read and Write access to links",
  "tags.read": "Read access to tags",
  "tags.write": "Read and Write access to tags",
  "analytics.read": "Read access to analytics and events",
  "domains.read": "Read access to domains",
  "domains.write": "Read and Write access to domains",
  "user.read": "Read your name, email and profile image",
};
