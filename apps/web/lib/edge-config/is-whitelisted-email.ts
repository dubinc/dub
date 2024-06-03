import { get } from "@vercel/edge-config";

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
