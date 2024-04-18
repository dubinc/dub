import prisma from "@/lib/prisma";
import { nanoid } from "@dub/utils";
import { Project } from "@prisma/client";
import { integrationTestEnv } from "./env";

const workspaceSlug = `dub-${nanoid()}`;
let teardownHappened = false;

const { USER_ID } = integrationTestEnv.parse(process.env);

declare module "vitest" {
  export interface ProvidedContext {
    workspace: Project & { workspaceId: string };
  }
}

export async function setup({ provide }) {
  const workspace = await prisma.project.create({
    data: {
      name: "Dub",
      slug: workspaceSlug,
      plan: "pro",
      inviteCode: nanoid(6),
      billingCycleStart: new Date().getDate(),
      users: {
        create: {
          userId: USER_ID,
          role: "owner",
        },
      },
      defaultDomains: {
        create: {},
      },
    },
  });

  provide("workspace", { ...workspace, workspaceId: `ws_${workspace.id}` });
}

export async function teardown() {
  if (teardownHappened) {
    throw new Error("teardown called twice");
  }

  teardownHappened = true;

  await prisma.$transaction([
    prisma.project.deleteMany({
      where: {
        slug: workspaceSlug,
      },
    }),
  ]);

  await prisma.$disconnect();
}
