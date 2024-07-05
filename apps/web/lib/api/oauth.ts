export const TOKEN_LENGTH = {
  clientId: 32,
  clientSecret: 32,
  accessToken: 40,
  refreshToken: 40,
  code: 40,
};

export const TOKEN_EXPIRY = {
  code: 2 * 60 * 1000, // 2 minutes
  accessToken: 2 * 60 * 60 * 1000, // 2 hours
  refreshToken: 60 * 24 * 60 * 60 * 1000, // 60 days
};
