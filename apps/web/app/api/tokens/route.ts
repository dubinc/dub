import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { scopesToName, validateScopesForRole } from "@/lib/api/tokens/scopes";
import { parseRequestBody } from "@/lib/api/utils";
import { hashToken, withWorkspace } from "@/lib/auth";
import { generateRandomName } from "@/lib/names";
import { ratelimit } from "@/lib/upstash";
import { createTokenSchema, tokenSchema } from "@/lib/zod/schemas/token";
import { sendEmail } from "@dub/email";
import APIKeyCreated from "@dub/email/templates/api-key-created";
import { prisma } from "@dub/prisma";
import { Prisma, User } from "@dub/prisma/client";
import { getCurrentPlan, nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

const MAX_WORKSPACE_TOKENS = 100;

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
    const { success } = await ratelimit(1, "5 s").limit(
      `create-tokens:${workspace.id}`,
    );

    if (!success) {
      throw new DubApiError({
        code: "rate_limit_exceeded",
        message: "Too many requests. Please try again later.",
      });
    }

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

    // Create token
    const token = `dub_${nanoid(24)}`;
    const hashedKey = await hashToken(token);
    const partialKey = `${token.slice(0, 3)}...${token.slice(-4)}`;

    await prisma.$transaction(
      async (tx) => {
        const totalTokens = await tx.restrictedToken.count({
          where: {
            projectId: workspace.id,
            installationId: null, // Skip OAuth installations tokens
          },
        });

        if (totalTokens >= MAX_WORKSPACE_TOKENS) {
          throw new DubApiError({
            code: "forbidden",
            message: `You've reached your limit of ${MAX_WORKSPACE_TOKENS} API keys for this workspace. Please contact support to increase this limit.`,
          });
        }

        // Create machine user if needed
        if (isMachine) {
          machineUser = await tx.user.create({
            data: {
              id: createId({ prefix: "user_" }),
              name: `${generateRandomName()} (Machine User)`,
              isMachine: true,
            },
            select: {
              id: true,
            },
          });

          // Add machine user to workspace
          await tx.projectUsers.create({
            data: {
              role: "member",
              userId: machineUser.id,
              projectId: workspace.id,
            },
          });
        }

        return await tx.restrictedToken.create({
          data: {
            name,
            hashedKey,
            partialKey,
            userId: isMachine ? machineUser?.id! : session.user.id,
            projectId: workspace.id,
            rateLimit: getCurrentPlan(workspace.plan).limits.api,
            scopes:
              scopes && scopes.length > 0
                ? [...new Set(scopes)].join(" ")
                : null,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadUncommitted,
        maxWait: 5000,
        timeout: 5000,
      },
    );

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
