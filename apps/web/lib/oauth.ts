import { prisma } from "@/lib/prisma";
import { nanoid } from "@dub/utils";
import { redirect } from "next/navigation";
import { TOKEN_EXPIRY, TOKEN_LENGTH } from "./api/oauth";
import { getSession } from "./auth";
import { authorizeSchema } from "./zod/schemas/oauth";

export const vaidateAuthorizeRequest = async (params: any) => {
  const request = authorizeSchema.parse(params);
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

// Handle the authorize request and create a new OAuth code
export const handleAuthorize = async (formData: FormData) => {
  "use server";

  const session = await getSession();

  if (!session) {
    return redirect("/login");
  }

  const workspaceId = formData.get("workspaceId");

  if (!workspaceId) {
    throw new Error("Please select a workspace to authorize the app");
  }

  const { oAuthClient, request } = await vaidateAuthorizeRequest(
    Object.fromEntries(formData),
  );

  console.info("Authorize request", request);

  const { code } = await prisma.oAuthCode.create({
    data: {
      clientId: request.client_id,
      redirectUri: request.redirect_uri,
      projectId: workspaceId as string,
      userId: session.user.id,
      scopes: oAuthClient.scopes,
      code: nanoid(TOKEN_LENGTH.code),
      expiresAt: new Date(Date.now() + TOKEN_EXPIRY.code),
    },
  });

  const searchParams = new URLSearchParams({
    code,
    ...(request.state && { state: request.state }),
  });

  return redirect(`${request.redirect_uri}?${searchParams.toString()}`);
};
