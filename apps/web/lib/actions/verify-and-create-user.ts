"use server";

import { hashPassword } from "@/lib/auth/password.ts";
import { prisma } from "@dub/prisma";
import { generateRandomString } from "@dub/utils/src";
import slugify from "@sindresorhus/slugify";
import { nanoid } from "nanoid";

export interface CreateWorkspaceParams {
  password?: string;
  code?: string;
  userId: string;
  email: string;
}

export async function verifyAndCreateUser({
  password,
  code,
  userId,
  email,
}: CreateWorkspaceParams) {
  return prisma.$transaction(async (tx) => {
    if (code) {
      await tx.emailVerificationToken.delete({
        where: {
          identifier: email,
          token: code,
        },
      });
    }

    const workspaceRes = await tx.project.create({
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

    let createdUser;
    try {
      createdUser = await tx.user.create({
        data: {
          id: userId,
          email,
          emailVerified: new Date(),
          defaultWorkspace: workspaceRes.slug,
          ...(password && { passwordHash: await hashPassword(password) }),
        },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          defaultWorkspace: true,
        },
      });
    } catch (error: any) {
      if (error?.code === "P2002" && error?.meta?.target?.includes("email")) {
        throw new Error("User with this email already exists");
      }
      throw error;
    }

    return {
      workspace: workspaceRes,
      user: createdUser,
    };
  });
}
