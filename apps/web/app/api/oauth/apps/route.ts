import { DubApiError } from "@/lib/api/errors";
import { OAUTH_CONFIG } from "@/lib/api/oauth/constants";
import { createToken } from "@/lib/api/oauth/utils";
import { parseRequestBody } from "@/lib/api/utils";
import { hashToken, withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { storage } from "@/lib/storage";
import z from "@/lib/zod";
import { createOAuthAppSchema, oAuthAppSchema } from "@/lib/zod/schemas/oauth";
import { nanoid } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/oauth/apps - get all OAuth apps created by a workspace
export const GET = withWorkspace(
  async ({ workspace }) => {
    const oAuthApp = await prisma.oAuthApp.findMany({
      where: {
        integration: {
          projectId: workspace.id,
        },
      },
      select: {
        clientId: true,
        partialClientSecret: true,
        redirectUris: true,
        pkce: true,
        integration: true,
      },
    });

    const oAuthApps = oAuthApp.map(({ integration, ...oAuthApp }) => ({
      ...oAuthApp,
      ...integration,
    }));

    return NextResponse.json(z.array(oAuthAppSchema).parse(oAuthApps));
  },
  {
    requiredPermissions: ["oauth_apps.read"],
  },
);

// POST /api/oauth/apps - create a new OAuth app
export const POST = withWorkspace(
  async ({ req, workspace, session }) => {
    const {
      name,
      slug,
      developer,
      website,
      installUrl,
      description,
      readme,
      redirectUris,
      logo,
      pkce,
      screenshots,
    } = createOAuthAppSchema.parse(await parseRequestBody(req));

    const integration = await prisma.integration.findUnique({
      where: {
        slug,
      },
    });

    if (integration) {
      throw new DubApiError({
        code: "conflict",
        message: `The slug "${slug}" is already in use.`,
      });
    }

    const clientId = createToken({
      length: OAUTH_CONFIG.CLIENT_ID_LENGTH,
      prefix: OAUTH_CONFIG.CLIENT_ID_PREFIX,
    });

    const clientSecret = !pkce
      ? createToken({
          length: OAUTH_CONFIG.CLIENT_SECRET_LENGTH,
          prefix: OAUTH_CONFIG.CLIENT_SECRET_PREFIX,
        })
      : undefined;

    try {
      const { oAuthApp, ...integration } = await prisma.integration.create({
        data: {
          projectId: workspace.id,
          userId: session.user.id,
          name,
          slug,
          developer,
          website,
          installUrl,
          description,
          readme,
          screenshots,
          oAuthApp: {
            create: {
              clientId,
              hashedClientSecret: clientSecret
                ? await hashToken(clientSecret)
                : "",
              partialClientSecret: clientSecret
                ? `dub_app_secret_****${clientSecret.slice(-8)}`
                : "",
              redirectUris,
              pkce,
            },
          },
        },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          name: true,
          slug: true,
          description: true,
          developer: true,
          logo: true,
          website: true,
          installUrl: true,
          readme: true,
          screenshots: true,
          verified: true,
          oAuthApp: true,
        },
      });

      if (logo) {
        const { url } = await storage.upload(
          `integrations/${integration.id}_${nanoid(7)}`,
          logo,
        );

        await prisma.integration.update({
          where: {
            id: integration.id,
          },
          data: {
            logo: url,
          },
        });
      }

      return NextResponse.json(
        {
          ...oAuthAppSchema.parse({ ...oAuthApp, ...integration }),
          ...(clientSecret && { clientSecret }),
        },
        { status: 201 },
      );
    } catch (error) {
      if (error.code === "P2002") {
        throw new DubApiError({
          code: "conflict",
          message: `The slug "${slug}" is already in use.`,
        });
      } else {
        throw new DubApiError({
          code: "internal_server_error",
          message: error.message,
        });
      }
    }
  },
  {
    requiredPermissions: ["oauth_apps.write"],
  },
);
