import { get } from "@vercel/edge-config";

export const isBlacklistedEmail = async (email: string | string[]) => {
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

  if (Array.isArray(email)) {
    return email.some((e) =>
      new RegExp(blacklistedEmails.join("|"), "i").test(e),
    );
  }

  return new RegExp(blacklistedEmails.join("|"), "i").test(email);
};
