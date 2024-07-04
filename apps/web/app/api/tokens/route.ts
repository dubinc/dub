import { scopesToName } from "@/lib/api/tokens/scopes";
import { parseRequestBody } from "@/lib/api/utils";
import { hashToken, withWorkspace } from "@/lib/auth";
import { generateRandomName } from "@/lib/names";
import { prisma } from "@/lib/prisma";
import { createTokenSchema, tokenSchema } from "@/lib/zod/schemas/token";
import { getCurrentPlan, nanoid } from "@dub/utils";
import { User } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { sendEmail } from "emails";
import APIKeyCreated from "emails/api-key-created";
import { NextResponse } from "next/server";

// POST /api/tokens – create a new token for a workspace
export const POST = withWorkspace(
  async ({ req, session, workspace }) => {
    const { name, isMachine, scopes } = createTokenSchema.parse(
      await parseRequestBody(req),
    );

    let machineUser: User | null = null;

    // Create machine user if needed
    if (isMachine) {
      const randomName = generateRandomName();
      machineUser = await prisma.user.create({
        data: {
          name: `${randomName} (Machine User)`,
          isMachine: true,
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
    requiredScopes: ["tokens.write"],
  },
);

// GET /api/tokens - get all tokens for a workspace
export const GET = withWorkspace(
  async ({ workspace }) => {
    const tokens = await prisma.restrictedToken.findMany({
      where: {
        projectId: workspace.id,
        clientId: null, // Hide OAuth tokens from workspace tokens
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
    });

    return NextResponse.json(tokenSchema.array().parse(tokens));
  },
  {
    requiredScopes: ["tokens.read"],
  },
);
