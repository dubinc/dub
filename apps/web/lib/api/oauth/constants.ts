// Lifetime in seconds
export const OAUTH_ACCESS_TOKEN_LIFETIME = 2 * 60 * 60; // 2 hours
export const OAUTH_REFRESH_TOKEN_LIFETIME = 60 * 24 * 60 * 60; // 60 days
export const OAUTH_CODE_LIFETIME = 2 * 60; // 2 minutes

export const OAUTH_CLIENT_ID_LENGTH = 32;
export const OAUTH_CLIENT_SECRET_LENGTH = 32;
export const OAUTH_ACCESS_TOKEN_LENGTH = 40;
export const OAUTH_REFRESH_TOKEN_LENGTH = 40;
export const OAUTH_CODE_LENGTH = 40;

// TODO:
// Keep it short and simple (Discuss with Steven)
export const OAUTH_CLIENT_SECRET_PREFIX = "dub_app_secret_";
export const OAUTH_ACCESS_TOKEN_PREFIX = "dub_access_token_";
export const OAUTH_REFRESH_TOKEN_PREFIX = "dub_refresh_token_";

// These are the scopes an OAuth app can request on behalf of an user
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
  "users.read",
];

// Scope descriptions
export const OAUTH_SCOPE_DESCRIPTIONS = {
  "users.read": "Read access to your profile",
  "workspaces.read": "Read access to workspace",
  "workspaces.write": "Read and Write access to workspace",
  "links.read": "Read access to links",
  "links.write": "Read and Write access to links",
  "tags.read": "Read access to tags",
  "tags.write": "Read and Write access to tags",
  "analytics.read": "Read access to analytics and events",
  "domains.read": "Read access to domains",
  "domains.write": "Read and Write access to domains",
};
