import { getDomainWithoutWWW } from "@dub/utils";
import { get } from "@vercel/edge-config";

export const isBlacklistedReferrer = async (referrer: string | null) => {
  if (!process.env.NEXT_PUBLIC_IS_DUB || !process.env.EDGE_CONFIG) {
    return false;
  }

  const hostname = referrer ? getDomainWithoutWWW(referrer) : "(direct)";
  let referrers;
  try {
    referrers = await get("referrers");
  } catch (e) {
    referrers = [];
  }
  return !referrers.includes(hostname);
};
