"use server";

import { prisma } from "@/lib/prisma";
import { authorizeRequestSchema } from "../../zod/schemas/oauth";
import { fromZodError } from "../errors";

export const vaidateAuthorizeRequest = async (params: any) => {
  const request = authorizeRequestSchema.safeParse(params);

  if (!request.success) {
    const formattedError = fromZodError(request.error);

    return {
      error: formattedError.error.message,
    };
  }

  const { client_id: clientId, redirect_uri: redirectUri } = request.data;

  const oAuthApp = await prisma.oAuthApp.findFirst({
    where: {
      clientId,
    },
  });

  if (!oAuthApp) {
    return {
      error: "Could not find OAuth application.",
    };
  }

  const redirectUris = (oAuthApp.redirectUris || []) as string[];

  if (!redirectUris.includes(redirectUri)) {
    return {
      error: "Invalid redirect_uri parameter for the application.",
    };
  }

  return {
    oAuthApp,
    requestParams: request.data,
  };
};
