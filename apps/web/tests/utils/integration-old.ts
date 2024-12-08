import { Project, User } from "@dub/prisma";
import { type TaskContext } from "vitest";
import { z } from "zod";
import { env, integrationTestEnv } from "./env";
import { HttpClient } from "./http";

interface Resources {
  user: Pick<User, "id">;
  workspace: Pick<Project, "id" | "slug" | "name"> & { workspaceId: string };
  apiKey: { token: string };
}

export class IntegrationHarnessOld {
  private readonly ctx?: TaskContext;
  private env: z.infer<typeof integrationTestEnv>;
  public resources: Resources;
  public baseUrl: string;
  public http: HttpClient;

  constructor(ctx?: TaskContext) {
    this.env = env;
    this.ctx = ctx;
    this.baseUrl = this.env.E2E_BASE_URL;
    this.http = new HttpClient({
      baseUrl: `${this.baseUrl}/api`,
      headers: {
        Authorization: `Bearer ${this.env.E2E_TOKEN}`,
      },
    });
  }

  async init() {
    const user = {
      id: this.env.E2E_USER_ID,
    };

    const apiKey = {
      token: this.env.E2E_TOKEN_OLD,
    };

    const workspace = {
      id: this.env.E2E_WORKSPACE_ID,
      slug: "acme",
      name: "Acme, Inc.",
    };

    this.resources = {
      user,
      apiKey,
      workspace: {
        ...workspace,
        workspaceId: workspace.id,
      },
    };

    return { ...this.resources, http: this.http };
  }

  // Delete link
  public async deleteLink(id: string) {
    const { workspaceId } = this.resources.workspace;

    await this.http.delete({
      path: `/links/${id}`,
      query: { workspaceId },
    });
  }
}
