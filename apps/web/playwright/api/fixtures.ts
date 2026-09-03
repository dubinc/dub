import { test as base, type APIRequestContext } from "@playwright/test";
import { readFileSync } from "fs";
import path from "path";

const authFile = path.join(__dirname, "../.auth/api.json");

type ApiResponse<T> = {
  status: number;
  data: T;
};

export type ApiClient = {
  get: <T>(url: string) => Promise<ApiResponse<T>>;
  post: <T>(url: string, data?: unknown) => Promise<ApiResponse<T>>;
  patch: <T>(url: string, data?: unknown) => Promise<ApiResponse<T>>;
  delete: <T>(url: string) => Promise<ApiResponse<T>>;
};

type WorkerFixtures = {
  api: ApiClient;
  workspace: { id: string; slug: string };
  program: { id: string; defaultGroupId: string };
};

function loadApiAuth() {
  return JSON.parse(readFileSync(authFile, "utf-8")) as {
    token: string;
    workspaceId: string;
    workspaceSlug: string;
    programId: string;
    defaultGroupId: string;
  };
}

function createApiClient(request: APIRequestContext): ApiClient {
  async function parse<T>(
    responsePromise: ReturnType<APIRequestContext["fetch"]>,
  ): Promise<ApiResponse<T>> {
    const response = await responsePromise;
    return {
      status: response.status(),
      data: (await response.json()) as T,
    };
  }

  return {
    get: <T>(url: string) => parse<T>(request.get(url)),
    post: <T>(url: string, data?: unknown) =>
      parse<T>(request.post(url, { data })),
    patch: <T>(url: string, data?: unknown) =>
      parse<T>(request.patch(url, { data })),
    delete: <T>(url: string) => parse<T>(request.delete(url)),
  };
}

export const test = base.extend<{}, WorkerFixtures>({
  // Authenticated API client (token from globalSetup → .auth/api.json).
  // Worker-scoped so beforeAll hooks can use api/program (Playwright rejects test-scoped fixtures there).
  api: [
    async ({ playwright }, use, workerInfo) => {
      const { token } = loadApiAuth();
      const context = await playwright.request.newContext({
        baseURL: workerInfo.project.use.baseURL,
        extraHTTPHeaders: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      await use(createApiClient(context));
      await context.dispose();
    },
    { scope: "worker" },
  ],

  workspace: [
    async ({}, use) => {
      const { workspaceId, workspaceSlug } = loadApiAuth();
      await use({ id: workspaceId, slug: workspaceSlug });
    },
    { scope: "worker" },
  ],

  program: [
    async ({}, use) => {
      const { programId, defaultGroupId } = loadApiAuth();
      await use({ id: programId, defaultGroupId });
    },
    { scope: "worker" },
  ],
});
