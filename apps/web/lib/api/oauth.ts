export const TOKEN_LENGTHS = {
  clientId: 32,
  clientSecret: 40,
  accessToken: 64,
  refreshToken: 64,
};

export const TOKEN_EXPIRY = {
  accessToken: 1000 * 60 * 60 * 24, // 24 hours
  refreshToken: 1000 * 60 * 60 * 24 * 30 * 6, // 6 months
};
