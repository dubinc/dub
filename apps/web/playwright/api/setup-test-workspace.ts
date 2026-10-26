import { createId } from "@/lib/api/create-id";
import { hashToken } from "@/lib/auth/hash-token";
import { prisma } from "@/lib/prisma";
import { config as loadEnv } from "dotenv-flow";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { PLAYWRIGHT_API_BASE } from "./constants";

loadEnv({
  silent: true,
});

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
  domain: "playwright-api.dub-internal-test.com",
  shopify: {
    storeId: "playwright-api.myshopify.com",
  },
} as const;

const authFile = path.join(__dirname, "../.auth/api.json");

// Upserts a dedicated Playwright API user, workspace, membership,
// RestrictedToken, and domain. Safe to run repeatedly from globalSetup.
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
      shopifyStoreId: TEST_WORKSPACE.shopify.storeId,
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
      shopifyStoreId: TEST_WORKSPACE.shopify.storeId,
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

  await prisma.domain.upsert({
    where: {
      slug: TEST_WORKSPACE.domain,
    },
    update: {
      projectId: workspace.id,
      verified: true,
    },
    create: {
      id: createId({ prefix: "dom_" }),
      slug: TEST_WORKSPACE.domain,
      projectId: workspace.id,
      verified: true,
    },
  });

  await mkdir(path.dirname(authFile), { recursive: true });
  await writeFile(
    authFile,
    JSON.stringify(
      {
        token,
        workspaceId: workspace.id,
        baseURL: PLAYWRIGHT_API_BASE,
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
