import { APPLICATION_ID_COOKIE_PREFIX } from "./constants";

export function getApplicationEventCookieName(programId: string) {
  return `${APPLICATION_ID_COOKIE_PREFIX}${programId}`;
}
