"use server";

import { redis } from "@/lib/upstash";
import { generateRandomString } from "@dub/utils/src";
import slugify from "@sindresorhus/slugify";
import { nanoid } from "nanoid";

export interface CreateWorkspaceParams {
  prismaClient: any;
  userId: string;
  email: string;
}

export interface WorkspaceResponse {
  id: string;
  name: string;
  slug: string;
  plan?: string;
  flags?: any;
  users: Array<{
    role: string;
  }>;
  domains: Array<{
    slug: string;
    primary: boolean;
  }>;
}

export async function createWorkspaceForUser({
  prismaClient,
  userId,
  email,
}: CreateWorkspaceParams): Promise<WorkspaceResponse> {
  const workspaceResponse = await prismaClient.project.create({
    data: {
      name: email,
      slug: slugify(email),
      users: {
        create: {
          userId,
          role: "owner",
          notificationPreference: {
            create: {},
          },
        },
      },
      billingCycleStart: new Date().getDate(),
      invoicePrefix: generateRandomString(8),
      inviteCode: nanoid(24),
      defaultDomains: {
        create: {},
      },
    },
    include: {
      users: {
        where: {
          userId,
        },
        select: {
          role: true,
        },
      },
      domains: {
        select: {
          slug: true,
          primary: true,
        },
      },
    },
  });

  await prismaClient.user.update({
    where: {
      id: userId,
    },
    data: {
      defaultWorkspace: workspaceResponse.slug,
    },
  });

  await redis.set(`onboarding-step:${userId}`, "completed");

  return workspaceResponse;
} 