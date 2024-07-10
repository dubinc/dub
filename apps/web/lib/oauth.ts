"use server";

import { prisma } from "@/lib/prisma";
import { fromZodError } from "./api/errors";
import { authorizeRequestSchema } from "./zod/schemas/oauth";

export const vaidateAuthorizeRequest = async (params: any) => {
  const request = authorizeRequestSchema.safeParse(params);

  if (!request.success) {
    const formattedError = fromZodError(request.error);

    return {
      error: formattedError.error.message,
    };
  }

  const requestParams = request.data;
  const { client_id: clientId, redirect_uri: redirectUri } = requestParams;

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

  if (oAuthApp.redirectUri !== redirectUri) {
    return {
      error: "Invalid redirect_uri parameter for the application.",
    };
  }

  return {
    oAuthApp,
    requestParams,
  };
};
