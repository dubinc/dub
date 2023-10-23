import { withAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import jackson, { samlAudience } from "@/lib/jackson";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

// GET /api/projects/[slug]/saml – get SAML connections for a specific project
export const GET = withAuth(async ({ project }) => {
  const { apiController } = await jackson();

  const connections = await apiController.getConnections({
    tenant: project.id,
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
});

// POST /api/projects/[slug]/saml – create a new SAML connection
export const POST = withAuth(
  async ({ req, project }) => {
    const { metadataUrl, encodedRawMetadata } = await req.json();

    const { apiController } = await jackson();

    const data = await apiController.createSAMLConnection({
      encodedRawMetadata,
      metadataUrl,
      defaultRedirectUrl: `${process.env.NEXTAUTH_URL}/auth/saml`,
      redirectUrl: process.env.NEXTAUTH_URL as string,
      tenant: project.id,
      product: "Dub",
    });

    return NextResponse.json(data);
  },
  {
    requiredRole: ["owner"],
    requiredPlan: ["enterprise"],
  },
);

// DELETE /api/projects/[slug]/saml – delete all SAML connections

export const DELETE = withAuth(
  async ({ searchParams }) => {
    const { clientID, clientSecret } = searchParams;

    const { apiController } = await jackson();

    await apiController.deleteConnections({
      clientID,
      clientSecret,
    });

    return NextResponse.json({ response: "removed SAML connection" });
  },
  {
    requiredRole: ["owner"],
    requiredPlan: ["enterprise"],
  },
);
