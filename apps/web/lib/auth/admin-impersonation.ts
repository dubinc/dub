import { redis } from "@/lib/upstash";

const KEY_PREFIX = "admin-impersonation:";
const TTL_SECONDS = 60; // Short window between successful token consume and session.create SAML check

const keyForEmail = (email: string) => `${KEY_PREFIX}${email.toLowerCase()}`;

export const markAdminImpersonation = async (email: string) => {
  await redis.set(keyForEmail(email), "1", {
    ex: TTL_SECONDS,
  });
};

export const consumeAdminImpersonation = async (email: string) => {
  const value = await redis.getdel<string>(keyForEmail(email));
  return value === "1";
};
