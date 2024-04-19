import { Project, User } from "@prisma/client";
import { type TaskContext } from "vitest";
import { z } from "zod";
import { HttpClient } from "../utils/http";
import { integrationTestEnv } from "./env";

interface Resources {
  user: Pick<User, "id">;
  workspace: Pick<Project, "id" | "slug" | "name"> & { workspaceId: string };
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
    const { USER_ID, TOKEN, WORKSPACE_ID, WORKSPACE_SLUG, WORKSPACE_NAME } =
      this.env;

    const user = {
      id: USER_ID,
    };

    const apiKey = {
      token: TOKEN,
    };

    const workspace = {
      id: WORKSPACE_ID,
      slug: WORKSPACE_SLUG,
      name: WORKSPACE_NAME,
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

  // Delete tag
  public async deleteTag(id: string) {
    const { workspaceId } = this.resources.workspace;

    await this.http.delete({
      path: `/tags/${id}`,
      query: { workspaceId },
    });
  }
}
