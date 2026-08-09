import { createId } from "@/lib/api/create-id";
import { hashToken } from "@/lib/auth/hash-token";
import { prisma } from "@/lib/prisma";
import { config as loadEnv } from "dotenv-flow";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

loadEnv();

export const TEST_WORKSPACE = {
  user: {
    email: "playwright-api@dub-internal-test.com",
    name: "Playwright API",
  },
  workspace: {
    slug: "playwright-api",
    name: "Playwright API",
  },
  token: {
    name: "Playwright API",
    value: "dub_playwright_api_test_key_fixed", // Fixed local/CI-only key
  },
} as const;

const authFile = path.join(__dirname, "../.auth/api.json");
const apiBaseURL = "http://localhost:8888";

// Upserts a dedicated Playwright API user, workspace, membership, and
// RestrictedToken. Safe to run repeatedly from globalSetup.
export async function setupTestWorkspace() {
  const user = await prisma.user.upsert({
    where: {
      email: TEST_WORKSPACE.user.email,
    },
    update: {
      name: TEST_WORKSPACE.user.name,
      emailVerified: new Date(),
      defaultWorkspace: TEST_WORKSPACE.workspace.slug,
    },
    create: {
      id: createId({ prefix: "user_" }),
      email: TEST_WORKSPACE.user.email,
      name: TEST_WORKSPACE.user.name,
      emailVerified: new Date(),
      defaultWorkspace: TEST_WORKSPACE.workspace.slug,
    },
  });

  const workspace = await prisma.project.upsert({
    where: {
      slug: TEST_WORKSPACE.workspace.slug,
    },
    update: {
      name: TEST_WORKSPACE.workspace.name,
      plan: "enterprise",
      tagsLimit: 1000,
      usageLimit: 1_000_000,
      linksLimit: 1_000_000,
      domainsLimit: 100,
      usersLimit: 100,
      foldersLimit: 100,
      aiLimit: 1000,
    },
    create: {
      id: createId({ prefix: "ws_" }),
      name: TEST_WORKSPACE.workspace.name,
      slug: TEST_WORKSPACE.workspace.slug,
      billingCycleStart: new Date().getDate(),
      plan: "enterprise",
      tagsLimit: 1000,
      usageLimit: 1_000_000,
      linksLimit: 1_000_000,
      domainsLimit: 100,
      usersLimit: 100,
      foldersLimit: 100,
      aiLimit: 1000,
    },
  });

  const projectUser = await prisma.projectUsers.upsert({
    where: {
      userId_projectId: {
        userId: user.id,
        projectId: workspace.id,
      },
    },
    update: {
      role: "owner",
    },
    create: {
      userId: user.id,
      projectId: workspace.id,
      role: "owner",
    },
  });

  await prisma.notificationPreference.upsert({
    where: {
      projectUserId: projectUser.id,
    },
    update: {},
    create: {
      projectUserId: projectUser.id,
    },
  });

  const token = TEST_WORKSPACE.token.value;
  const hashedKey = await hashToken(token);
  const partialKey = `${token.slice(0, 3)}...${token.slice(-4)}`;

  await prisma.restrictedToken.upsert({
    where: {
      hashedKey,
    },
    update: {
      name: TEST_WORKSPACE.token.name,
      partialKey,
      userId: user.id,
      projectId: workspace.id,
      scopes: "apis.all",
    },
    create: {
      name: TEST_WORKSPACE.token.name,
      hashedKey,
      partialKey,
      userId: user.id,
      projectId: workspace.id,
      scopes: "apis.all",
    },
  });

  await mkdir(path.dirname(authFile), { recursive: true });
  await writeFile(
    authFile,
    JSON.stringify(
      {
        token,
        workspaceId: workspace.id,
        baseURL: apiBaseURL,
        userId: user.id,
        workspaceSlug: workspace.slug,
      },
      null,
      2,
    ),
  );

  return {
    token,
    userId: user.id,
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
  };
}
