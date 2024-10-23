"use server";

import { prisma } from "@dub/prisma";
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
    select: {
      redirectUris: true,
      integration: {
        select: {
          name: true,
          developer: true,
          website: true,
          logo: true,
          verified: true,
        },
      },
    },
  });

  if (!oAuthApp || !oAuthApp.integration) {
    return {
      error:
        "Could not find OAuth application. Make sure you have the correct client_id.",
    };
  }

  const redirectUris = (oAuthApp.redirectUris || []) as string[];

  if (!redirectUris.includes(redirectUri)) {
    return {
      error:
        "Invalid redirect_uri parameter detected. Make sure you have allowlisted the redirect_uri in your OAuth app settings.",
    };
  }

  return {
    integration: { ...oAuthApp.integration },
    requestParams: request.data,
  };
};
