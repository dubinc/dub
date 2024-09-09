import { getServerSession } from "next-auth/next";
import { NextRequest } from "next/server";
import { DubApiError } from "../api/errors";
import { authOptions } from "./options";

export interface Session {
  user: {
    email: string;
    id: string;
    name: string;
    image?: string;
    isMachine: boolean;
    referredBy?: string;
  };
}

export const getSession = async () => {
  return getServerSession(authOptions) as Promise<Session>;
};

export const getAuthTokenOrThrow = (
  req: Request | NextRequest,
  type: "Bearer" | "Basic" = "Bearer",
) => {
  const authorizationHeader = req.headers.get("Authorization");

  if (!authorizationHeader) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "Misconfigured authorization header. Did you forget to add 'Bearer '? Learn more: https://d.to/auth",
    });
  }

  return authorizationHeader.replace(`${type} `, "");
};
