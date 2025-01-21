import { Project, User } from "@dub/prisma/client";
import { type TaskContext } from "vitest";
import { z } from "zod";
import { HttpClient } from "../utils/http";
import { env, integrationTestEnv } from "./env";

interface Resources {
  user: Pick<User, "id">;
  workspace: Pick<Project, "id" | "slug" | "name" | "webhookEnabled">;
  apiKey: { token: string };
}

export class IntegrationHarness {
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
      token: this.env.E2E_TOKEN,
    };

    const workspace = {
      id: this.env.E2E_WORKSPACE_ID,
      slug: "acme",
      name: "Acme, Inc.",
      webhookEnabled: true,
    };

    this.resources = {
      user,
      apiKey,
      workspace,
    };

    return { ...this.resources, http: this.http };
  }

  // Delete link
  public async deleteLink(id: string) {
    if (!id) return;

    await this.http.delete({
      path: `/links/${id}`,
    });
  }

  // Delete tag
  public async deleteTag(id: string) {
    if (!id) return;

    await this.http.delete({
      path: `/tags/${id}`,
    });
  }

  // Delete domain
  public async deleteDomain(slug: string) {
    await this.http.delete({
      path: `/domains/${slug}`,
    });
  }

  // Delete customer
  public async deleteCustomer(id: string) {
    await this.http.delete({
      path: `/customers/${id}`,
    });
  }
}
