import { withWorkspace } from "@/lib/auth";
import jackson, { samlAudience } from "@/lib/jackson";
import z from "@/lib/zod";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";

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
    requiredScopes: ["workspaces.read"],
  },
);

// POST /api/workspaces/[idOrSlug]/saml – create a new SAML connection
export const POST = withWorkspace(
  async ({ req, workspace }) => {
    const { metadataUrl, encodedRawMetadata } =
      createSAMLConnectionSchema.parse(await req.json());

    const { apiController } = await jackson();

    const data = await apiController.createSAMLConnection({
      encodedRawMetadata: encodedRawMetadata!,
      metadataUrl: metadataUrl!,
      defaultRedirectUrl: `${process.env.NEXTAUTH_URL}/auth/saml`,
      redirectUrl: process.env.NEXTAUTH_URL as string,
      tenant: workspace.id,
      product: "Dub",
    });

    return NextResponse.json(data);
  },
  {
    requiredScopes: ["workspaces.write"],
    requiredPlan: ["enterprise"],
  },
);

// DELETE /api/workspaces/[idOrSlug]/saml – delete all SAML connections
export const DELETE = withWorkspace(
  async ({ searchParams }) => {
    const { clientID, clientSecret } =
      deleteSAMLConnectionSchema.parse(searchParams);

    const { apiController } = await jackson();

    await apiController.deleteConnections({
      clientID,
      clientSecret,
    });

    return NextResponse.json({ response: "removed SAML connection" });
  },
  {
    requiredScopes: ["workspaces.write"],
  },
);
