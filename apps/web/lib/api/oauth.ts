export const TOKEN_LENGTH = {
  clientId: 32,
  clientSecret: 40,
  code: 64,
  accessToken: 64,
  refreshToken: 64,
};

export const TOKEN_EXPIRY = {
  code: 1000 * 60 * 2, // 2 minutes
  accessToken: 1000 * 60 * 60 * 24, // 24 hours
  refreshToken: 1000 * 60 * 60 * 24 * 30 * 6, // 6 months
};
