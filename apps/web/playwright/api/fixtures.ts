import { test as base, type APIRequestContext } from "@playwright/test";
import { readFileSync } from "fs";
import path from "path";

const authFile = path.join(__dirname, "../.auth/api.json");

type ApiResponse<T> = {
  status: number;
  data: T;
};

type ApiClient = {
  get: <T>(url: string) => Promise<ApiResponse<T>>;
  post: <T>(url: string, data?: unknown) => Promise<ApiResponse<T>>;
  delete: <T>(url: string) => Promise<ApiResponse<T>>;
};

function loadApiAuth(): { token: string } {
  return JSON.parse(readFileSync(authFile, "utf-8")) as { token: string };
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
    delete: <T>(url: string) => parse<T>(request.delete(url)),
  };
}

export const test = base.extend<{ api: ApiClient }>({
  // Authenticated API request context (token from globalSetup → .auth/api.json).
  request: async ({ playwright, baseURL }, use) => {
    const { token } = loadApiAuth();
    const context = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    await use(context);
    await context.dispose();
  },

  api: async ({ request }, use) => {
    await use(createApiClient(request));
  },
});
