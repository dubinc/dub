import { getDomainWithoutWWW } from "@dub/utils";
import { get, getAll } from "@vercel/edge-config";

export const isBlacklistedDomain = async ({
  domain,
  apexDomain,
}: {
  domain: string;
  apexDomain: string;
}): Promise<boolean | "whitelisted"> => {
  if (!process.env.NEXT_PUBLIC_IS_DUB || !process.env.EDGE_CONFIG) {
    return false;
  }

  if (!domain) {
    return false;
  }

  try {
    const {
      domains: blacklistedDomains,
      terms: blacklistedTerms,
      whitelistedDomains,
    } = await getAll(["domains", "terms", "whitelistedDomains"]);

    const blacklistedTermsRegex = new RegExp(
      blacklistedTerms
        .map((term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|"),
    );

    const isBlacklisted =
      blacklistedDomains.includes(domain) || blacklistedTermsRegex.test(domain);

    if (isBlacklisted) {
      return true;
    }

    if (whitelistedDomains.includes(apexDomain)) {
      return "whitelisted";
    }

    return false;
  } catch (e) {
    return false;
  }
};

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

export const isBlacklistedKey = async (key: string) => {
  if (!process.env.NEXT_PUBLIC_IS_DUB || !process.env.EDGE_CONFIG) {
    return false;
  }

  let blacklistedKeys;
  try {
    blacklistedKeys = await get("keys");
  } catch (e) {
    blacklistedKeys = [];
  }
  if (blacklistedKeys.length === 0) return false;
  return new RegExp(blacklistedKeys.join("|"), "i").test(key);
};

export const isWhitelistedEmail = async (email: string) => {
  if (!process.env.NEXT_PUBLIC_IS_DUB || !process.env.EDGE_CONFIG) {
    return false;
  }

  let whitelistedEmails;
  try {
    whitelistedEmails = await get("whitelistedEmails");
  } catch (e) {
    whitelistedEmails = [];
  }
  return whitelistedEmails.includes(email);
};

export const isBlacklistedEmail = async (email: string) => {
  if (!process.env.NEXT_PUBLIC_IS_DUB || !process.env.EDGE_CONFIG) {
    return false;
  }

  let blacklistedEmails;
  try {
    blacklistedEmails = await get("emails");
  } catch (e) {
    blacklistedEmails = [];
  }
  if (blacklistedEmails.length === 0) return false;
  return new RegExp(blacklistedEmails.join("|"), "i").test(email);
};

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

export const updateConfig = async ({
  key,
  value,
}: {
  key:
    | "domains"
    | "whitelistedDomains"
    | "terms"
    | "referrers"
    | "keys"
    | "whitelist"
    | "emails"
    | "reserved"
    | "reservedUsernames";
  value: string;
}) => {
  const existingData = (await get(key)) as string[];
  const newData = Array.from(new Set([...existingData, value]));

  return await fetch(
    `https://api.vercel.com/v1/edge-config/${process.env.EDGE_CONFIG_ID}/items?teamId=${process.env.TEAM_ID_VERCEL}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            operation: "update",
            key: key,
            value: newData,
          },
        ],
      }),
    },
  );
};
