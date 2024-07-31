import { DubApiError } from "@/lib/api/errors";
import { OAUTH_CONFIG } from "@/lib/api/oauth/constants";
import { createToken } from "@/lib/api/oauth/utils";
import { parseRequestBody } from "@/lib/api/utils";
import { hashToken, withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { createOAuthAppSchema, oAuthAppSchema } from "@/lib/zod/schemas/oauth";
import { nanoid } from "@dub/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/oauth/apps - get all OAuth apps created by a workspace
export const GET = withWorkspace(
  async ({ workspace }) => {
    const result = await prisma.oAuthApp.findMany({
      where: {
        projectId: workspace.id,
      },
      include: {
        _count: {
          select: { authorizedApps: true },
        },
      },
    });

    const apps = result.map((app) => ({
      ...app,
      installations: app._count.authorizedApps,
    }));

    return NextResponse.json(z.array(oAuthAppSchema).parse(apps));
  },
  {
    requiredPermissions: ["oauth_apps.read"],
    featureFlag: "integrations",
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
      description,
      readme,
      redirectUris,
      logo,
      pkce,
    } = createOAuthAppSchema.parse(await parseRequestBody(req));

    const app = await prisma.oAuthApp.findUnique({
      where: {
        slug,
      },
    });

    if (app) {
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
      let logoUrl: string | undefined;
      const appId = nanoid(25);

      if (logo) {
        const result = await storage.upload(
          `integrations/${appId}_${nanoid(7)}`,
          logo,
        );

        logoUrl = result.url;
      }

      const app = await prisma.oAuthApp.create({
        data: {
          id: appId,
          projectId: workspace.id,
          name,
          slug,
          developer,
          website,
          description,
          readme,
          redirectUris,
          clientId,
          hashedClientSecret: clientSecret ? await hashToken(clientSecret) : "",
          partialClientSecret: clientSecret
            ? `dub_app_secret_****${clientSecret.slice(-8)}`
            : "",
          userId: session.user.id,
          pkce,
          ...(logoUrl && { logo: logoUrl }),
        },
      });

      return NextResponse.json(
        {
          ...oAuthAppSchema.parse(app),
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
    featureFlag: "integrations",
  },
);
