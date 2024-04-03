import { hashToken } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { nanoid } from "@dub/utils";

export const init = async () => {
  // Create a user
  const user = await prisma.user.create({
    data: {
      name: "Kiran",
      email: "kiran+1@dub.co",
      emailVerified: new Date(),
    },
  });

  // Create a workspace for the user
  const workspace = await prisma.project.create({
    data: {
      name: "Dub",
      slug: "dub",
      users: {
        create: {
          userId: user.id,
          role: "owner",
        },
      },
      billingCycleStart: new Date().getDate(),
      defaultDomains: {
        create: {},
      },
    },
  });

  // Create an API key for the user
  const token = nanoid(24);
  await prisma.token.create({
    data: {
      name: "API Key",
      hashedKey: hashToken(token, {
        noSecret: true,
      }),
      partialKey: `${token.slice(0, 3)}...${token.slice(-4)}`,
      userId: user.id,
    },
  });

  return {
    user,
    workspace: { ...workspace, workspaceId: `ws_${workspace.id}` },
    apiKey: token,
  } as const;
};
