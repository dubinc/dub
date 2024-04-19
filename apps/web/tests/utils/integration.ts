import prisma from "@/lib/prisma";
import { Project, User } from "@prisma/client";
import { inject, type TaskContext } from "vitest";
import { z } from "zod";
import { HttpClient } from "../utils/http";
import { integrationTestEnv } from "./env";

interface Resources {
  user: Pick<User, "id">;
  workspace: Project & { workspaceId: string };
  apiKey: { token: string };
}

export class IntegrationHarness {
  private readonly ctx?: TaskContext;
  private env: z.infer<typeof integrationTestEnv>;
  public resources: Resources;
  public baseUrl: string;
  public http: HttpClient;

  constructor(ctx?: TaskContext) {
    this.env = integrationTestEnv.parse(process.env);

    this.ctx = ctx;
    this.baseUrl = this.env.API_BASE_URL;
    this.http = new HttpClient({
      baseUrl: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.env.TOKEN}`,
      },
    });
  }

  async init() {
    const user = {
      id: this.env.USER_ID,
    };

    const apiKey = {
      token: this.env.TOKEN,
    };

    const workspace = inject("workspace");

    this.resources = {
      user,
      workspace,
      apiKey,
    };

    return { ...this.resources, http: this.http };
  }

  public async teardown() {
    // await prisma.$transaction([
    //   prisma.project.deleteMany({
    //     where: {
    //       users: {
    //         some: {
    //           userId: this.resources.user.id,
    //         },
    //       },
    //     },
    //   }),
    //   prisma.user.delete({ where: { id: this.resources.user.id } }),
    // ]);
    // await prisma.$disconnect();
  }

  public async cleanup(id: string) {
    console.log("Deleting workspace", id);

    await prisma.project.delete({
      where: {
        id,
      },
    });
  }

  // Delete link
  public async deleteLink(id: string) {
    const { workspaceId } = this.resources.workspace;

    await this.http.delete({
      path: `/links/${id}`,
      query: { workspaceId },
    });
  }

  // Delete tag
  public async deleteTag(id: string) {
    const { workspaceId } = this.resources.workspace;

    await this.http.delete({
      path: `/tags/${id}`,
      query: { workspaceId },
    });
  }
}
