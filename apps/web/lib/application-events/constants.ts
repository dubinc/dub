export const APPLICATION_ID_COOKIE_PREFIX = "dub_application_id_";

export const APPLICATION_ID_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export const getApplicationIdCookieName = (programId: string) =>
  `${APPLICATION_ID_COOKIE_PREFIX}${programId}`;
