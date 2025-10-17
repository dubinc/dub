import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { isGenericEmail } from "@/lib/is-generic-email";
import { jackson, samlAudience } from "@/lib/jackson";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSAMLConnectionSchema = z
  .object({
    metadataUrl: z.string().url(),
    encodedRawMetadata: z.string(),
  })
  .partial()
  .refine(
    ({ metadataUrl, encodedRawMetadata }) =>
      metadataUrl != undefined || encodedRawMetadata != undefined,
    {
      message: "metadataUrl or encodedRawMetadata is required",
    },
  );

const deleteSAMLConnectionSchema = z.object({
  clientID: z.string().min(1),
  clientSecret: z.string().min(1),
});

// GET /api/workspaces/[idOrSlug]/saml – get SAML connections for a specific workspace
export const GET = withWorkspace(
  async ({ workspace }) => {
    const { apiController } = await jackson();

    const connections = await apiController.getConnections({
      tenant: workspace.id,
      product: "Dub",
    });

    const response = {
      connections,
      issuer: samlAudience,
      acs:
        process.env.NODE_ENV === "production"
          ? "https://api.dub.co/auth/saml/callback"
          : `${APP_DOMAIN_WITH_NGROK}/api/auth/saml/callback`,
    };

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["workspaces.read"],
  },
);

// POST /api/workspaces/[idOrSlug]/saml – create a new SAML connection
export const POST = withWorkspace(
  async ({ req, workspace, session }) => {
    const { metadataUrl, encodedRawMetadata } =
      createSAMLConnectionSchema.parse(await req.json());

    const ssoEmailDomain = session.user.email.split("@")[1].toLocaleLowerCase();

    if (isGenericEmail(ssoEmailDomain)) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "SAML configuration requires you to be logged in with your organization’s work email.",
      });
    }

    const { apiController } = await jackson();

    const data = await apiController.createSAMLConnection({
      encodedRawMetadata: encodedRawMetadata!,
      metadataUrl: metadataUrl!,
      defaultRedirectUrl: `${process.env.NEXTAUTH_URL}/auth/saml`,
      redirectUrl: process.env.NEXTAUTH_URL as string,
      tenant: workspace.id,
      product: "Dub",
    });

    await prisma.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        ssoEmailDomain,
      },
    });

    return NextResponse.json(data);
  },
  {
    requiredPermissions: ["workspaces.write"],
    requiredPlan: ["enterprise"],
  },
);

// DELETE /api/workspaces/[idOrSlug]/saml – delete all SAML connections
export const DELETE = withWorkspace(
  async ({ searchParams, workspace }) => {
    const { clientID, clientSecret } =
      deleteSAMLConnectionSchema.parse(searchParams);

    const { apiController } = await jackson();

    await apiController.deleteConnections({
      clientID,
      clientSecret,
    });

    await prisma.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        ssoEmailDomain: null,
        ssoEnforcedAt: null,
      },
    });

    return NextResponse.json({
      response: "Successfully removed SAML connection",
    });
  },
  {
    requiredPermissions: ["workspaces.write"],
  },
);
