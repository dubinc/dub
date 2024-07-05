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
