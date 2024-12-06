import { nanoid } from "@dub/utils";
import { ipAddress } from "@vercel/functions";
import { getToken } from "next-auth/jwt";
import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { ratelimit } from "../upstash";
import { DubApiError } from "./errors";

export const parseRequestBody = async (req: Request) => {
  try {
    return await req.json();
  } catch (e) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "Invalid JSON format in request body. Please ensure the request body is a valid JSON object.",
    });
  }
};

export const ratelimitOrThrow = async (
  req: NextRequest,
  identifier?: string,
) => {
  // Rate limit if user is not logged in
  const session = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!session?.email) {
    const ip = ipAddress(req);
    const { success } = await ratelimit().limit(
      `${identifier || "ratelimit"}:${ip}`,
    );
    if (!success) {
      throw new DubApiError({
        code: "rate_limit_exceeded",
        message: "Don't DDoS me pls 🥺",
      });
    }
  }
};

export const getIP = () => {
  const FALLBACK_IP_ADDRESS = "0.0.0.0";
  const forwardedFor = headers().get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0] ?? FALLBACK_IP_ADDRESS;
  }

  return headers().get("x-real-ip") ?? FALLBACK_IP_ADDRESS;
};

const prefixes = [
  "link_",
  "tag_",
  "dom_",
  "po_",
  "dash_",
  "int_",
  "app_",
  "cus_",
  "utm_",
  "wh_",
  "pgi_",
  "pge_",
  "pn_",
  "sale_",
  "pga_",
  "dub_embed_",
] as const;

export const createId = ({
  prefix,
  length = 24,
}: {
  prefix?: (typeof prefixes)[number];
  length?: number;
}) => {
  return `${prefix || ""}${nanoid(length)}`;
};
