import { get } from "@vercel/edge-config";

/**
 * Only for dub.sh / dub.link domains
 * Check if a username is reserved – should only be available on Pro+
 */
export const isReservedUsername = async (key: string) => {
  if (!process.env.NEXT_PUBLIC_IS_DUB || !process.env.EDGE_CONFIG) {
    return false;
  }

  let reservedUsernames;
  try {
    reservedUsernames = await get("reservedUsernames");
  } catch (e) {
    reservedUsernames = [];
  }
  return reservedUsernames.includes(key.toLowerCase());
};
