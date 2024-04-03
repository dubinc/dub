import { hashToken } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { nanoid } from "@dub/utils";
import { Project, Token, User } from "@prisma/client";
import type { TaskContext } from "vitest";
import { integrationTestEnv } from "./env";

interface Resources {
  user: User;
  workspace: Project & { workspaceId: string };
  apiKey: Token & { token: string };
}

export class IntegrationHarness {
  private readonly ctx: TaskContext;
  public resources: Resources;
  public baseUrl: string;

  constructor(ctx: TaskContext) {
    const env = integrationTestEnv.parse(process.env);

    this.ctx = ctx;
    this.baseUrl = env.API_BASE_URL;
  }

  async init() {
    this.resources = await this.seed();
    return this.resources;
  }

  async seed() {
    this.ctx.onTestFinished(async () => {
      await prisma.$transaction([
        prisma.project.delete({ where: { id: this.resources.workspace.id } }),
        prisma.token.delete({ where: { id: this.resources.apiKey.id } }),
        prisma.user.delete({ where: { id: this.resources.user.id } }),
      ]);

      await prisma.$disconnect();
    });

    // Create a user
    const user = await prisma.user.create({
      data: {
        name: "John",
        email: `john+${nanoid()}@dub.co`,
        emailVerified: new Date(),
      },
    });

    // Create a workspace for the user
    const workspace = await prisma.project.create({
      data: {
        name: "Dub",
        slug: `dub-${nanoid()}`,
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
    const apiKey = await prisma.token.create({
      data: {
        name: "API Key",
        hashedKey: hashToken(token, {
          noSecret: true,
        }),
        partialKey: `${token.slice(0, 3)}...${token.slice(-4)}`,
        userId: user.id,
      },
    });

    const resource = {
      user,
      workspace: { ...workspace, workspaceId: `ws_${workspace.id}` },
      apiKey: { ...apiKey, token },
    } as const;

    return resource;
  }
}
