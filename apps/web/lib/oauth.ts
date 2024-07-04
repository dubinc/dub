"use server";

import { prisma } from "@/lib/prisma";
import { authorizeRequestSchema } from "./zod/schemas/oauth";

export const vaidateAuthorizeRequest = async (params: any) => {
  const request = authorizeRequestSchema.parse(params);
  const { client_id: clientId, redirect_uri: redirectUri } = request;

  const oAuthClient = await prisma.oAuthClient.findFirst({
    where: {
      clientId,
    },
  });

  if (!oAuthClient) {
    throw new Error(`Could not find OAuth client with clientId ${clientId}`);
  }

  if (oAuthClient.redirectUri !== redirectUri) {
    throw new Error("Invalid redirect_uri parameter for the application.");
  }

  return {
    oAuthClient,
    request,
  };
};
