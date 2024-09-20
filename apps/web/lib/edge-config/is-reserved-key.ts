import { get } from "@vercel/edge-config";

/**
 * Only for dub.sh / dub.link domains
 * Check if a key is reserved – cannot be registered for a short link
 */

export const isReservedKey = async (key: string) => {
  if (!process.env.NEXT_PUBLIC_IS_DUB || !process.env.EDGE_CONFIG) {
    return false;
  }

  let reservedKeys;
  try {
    reservedKeys = await get("reserved");
  } catch (e) {
    reservedKeys = [];
  }
  return reservedKeys.includes(key.toLowerCase());
};
