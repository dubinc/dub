import { DubApiError } from "@/lib/api/errors";
import { scopesToName, validateScopesForRole } from "@/lib/api/tokens/scopes";
import { createId, parseRequestBody } from "@/lib/api/utils";
import { hashToken, withWorkspace } from "@/lib/auth";
import { generateRandomName } from "@/lib/names";
import { createTokenSchema, tokenSchema } from "@/lib/zod/schemas/token";
import { prisma } from "@dub/prisma";
import { User } from "@dub/prisma/client";
import { getCurrentPlan, nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { sendEmail } from "emails";
import APIKeyCreated from "emails/api-key-created";
import { NextResponse } from "next/server";

// GET /api/tokens - get all tokens for a workspace
export const GET = withWorkspace(
  async ({ workspace }) => {
    const tokens = await prisma.restrictedToken.findMany({
      where: {
        projectId: workspace.id,
        installationId: null,
      },
      select: {
        id: true,
        name: true,
        partialKey: true,
        scopes: true,
        lastUsed: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            isMachine: true,
          },
        },
      },
      orderBy: [{ lastUsed: "desc" }, { createdAt: "desc" }],
      take: 100,
    });

    return NextResponse.json(tokenSchema.array().parse(tokens));
  },
  {
    requiredPermissions: ["tokens.read"],
  },
);

// POST /api/tokens – create a new token for a workspace
export const POST = withWorkspace(
  async ({ req, session, workspace }) => {
    const { name, isMachine, scopes } = createTokenSchema.parse(
      await parseRequestBody(req),
    );

    let machineUser: Pick<User, "id"> | null = null;

    const { role } = await prisma.projectUsers.findUniqueOrThrow({
      where: {
        userId_projectId: {
          userId: session.user.id,
          projectId: workspace.id,
        },
      },
      select: {
        role: true,
      },
    });

    // Only workspace owners can create machine users
    if (isMachine && role !== "owner") {
      throw new DubApiError({
        code: "forbidden",
        message: "Only workspace owners can create machine users.",
      });
    }

    if (!validateScopesForRole(scopes || [], role)) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: "Some of the given scopes are not available for your role.",
      });
    }

    // Create machine user if needed
    if (isMachine) {
      const randomName = generateRandomName();
      machineUser = await prisma.user.create({
        data: {
          id: createId({ prefix: "user_" }),
          name: `${randomName} (Machine User)`,
          isMachine: true,
        },
        select: {
          id: true,
        },
      });

      // Add machine user to workspace
      await prisma.projectUsers.create({
        data: {
          role: "member",
          userId: machineUser.id,
          projectId: workspace.id,
        },
      });
    }

    // Create token
    const token = `dub_${nanoid(24)}`;
    const hashedKey = await hashToken(token);
    const partialKey = `${token.slice(0, 3)}...${token.slice(-4)}`;

    await prisma.restrictedToken.create({
      data: {
        name,
        hashedKey,
        partialKey,
        userId: isMachine ? machineUser?.id! : session.user.id,
        projectId: workspace.id,
        rateLimit: getCurrentPlan(workspace.plan).limits.api,
        scopes:
          scopes && scopes.length > 0 ? [...new Set(scopes)].join(" ") : null,
      },
    });

    waitUntil(
      sendEmail({
        email: session.user.email,
        subject: `A new API key has been created for your workspace ${workspace.name} on Dub`,
        react: APIKeyCreated({
          email: session.user.email,
          token: {
            name,
            type: scopesToName(scopes || []).name,
            permissions: scopesToName(scopes || []).description,
          },
          workspace: {
            name: workspace.name,
            slug: workspace.slug,
          },
        }),
      }),
    );

    return NextResponse.json({ token });
  },
  {
    requiredPermissions: ["tokens.write"],
  },
);
