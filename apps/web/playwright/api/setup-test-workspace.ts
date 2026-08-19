import { createId } from "@/lib/api/create-id";
import { hashToken } from "@/lib/auth/hash-token";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_ADDITIONAL_PARTNER_LINKS,
  DEFAULT_PARTNER_GROUP,
} from "@/lib/zod/schemas/groups";
import { config as loadEnv } from "dotenv-flow";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

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
  program: {
    domain: "playwright-api.dub-internal-test.com",
    url: "https://example.com",
  },
} as const;

const authFile = path.join(__dirname, "../.auth/api.json");
const apiBaseURL = "http://localhost:8888";

// Upserts a dedicated Playwright API user, workspace, membership,
// RestrictedToken, and partner program. Safe to run repeatedly from globalSetup.
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
      partnersLimit: 1000,
      groupsLimit: 100,
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
      partnersLimit: 1000,
      groupsLimit: 100,
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

  const { programId, defaultGroupId } = await setupTestProgram({
    workspaceId: workspace.id,
    userId: user.id,
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
        programId,
        defaultGroupId,
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
    programId,
    defaultGroupId,
  };
}

async function setupTestProgram({
  workspaceId,
  userId,
}: {
  workspaceId: string;
  userId: string;
}) {
  await prisma.domain.upsert({
    where: {
      slug: TEST_WORKSPACE.program.domain,
    },
    update: {
      projectId: workspaceId,
      verified: true,
    },
    create: {
      id: createId({ prefix: "dom_" }),
      slug: TEST_WORKSPACE.program.domain,
      projectId: workspaceId,
      verified: true,
    },
  });

  const folderId = createId({ prefix: "fold_" });
  const folder = await prisma.folder.upsert({
    where: {
      name_projectId: {
        name: "Partner Links",
        projectId: workspaceId,
      },
    },
    update: {},
    create: {
      id: folderId,
      name: "Partner Links",
      projectId: workspaceId,
      accessLevel: "write",
    },
  });

  await prisma.folderUser.upsert({
    where: {
      folderId_userId: {
        folderId: folder.id,
        userId,
      },
    },
    update: {
      role: "owner",
    },
    create: {
      folderId: folder.id,
      userId,
      role: "owner",
    },
  });

  const didCreateFolder = folder.id === folderId;
  const programId = createId({ prefix: "prog_" });
  const defaultGroupId = createId({ prefix: "grp_" });

  const program = await prisma.program.upsert({
    where: {
      slug: TEST_WORKSPACE.workspace.slug,
    },
    create: {
      id: programId,
      workspaceId,
      name: TEST_WORKSPACE.workspace.name,
      slug: TEST_WORKSPACE.workspace.slug,
      domain: TEST_WORKSPACE.program.domain,
      url: TEST_WORKSPACE.program.url,
      defaultFolderId: folder.id,
      defaultGroupId,
    },
    update: {
      name: TEST_WORKSPACE.workspace.name,
      domain: TEST_WORKSPACE.program.domain,
      url: TEST_WORKSPACE.program.url,
      defaultFolderId: folder.id,
    },
  });

  const group = await prisma.partnerGroup.upsert({
    where: {
      programId_slug: {
        programId: program.id,
        slug: DEFAULT_PARTNER_GROUP.slug,
      },
    },
    create: {
      id: program.defaultGroupId,
      programId: program.id,
      slug: DEFAULT_PARTNER_GROUP.slug,
      name: DEFAULT_PARTNER_GROUP.name,
      color: DEFAULT_PARTNER_GROUP.color,
      maxPartnerLinks: DEFAULT_ADDITIONAL_PARTNER_LINKS,
    },
    update: {
      name: DEFAULT_PARTNER_GROUP.name,
      maxPartnerLinks: DEFAULT_ADDITIONAL_PARTNER_LINKS,
    },
  });

  await prisma.program.update({
    where: {
      id: program.id,
    },
    data: {
      defaultGroupId: group.id,
    },
  });

  await prisma.partnerGroupDefaultLink.upsert({
    where: {
      groupId_url: {
        groupId: group.id,
        url: TEST_WORKSPACE.program.url,
      },
    },
    create: {
      id: createId({ prefix: "pgdl_" }),
      programId: program.id,
      groupId: group.id,
      domain: TEST_WORKSPACE.program.domain,
      url: TEST_WORKSPACE.program.url,
    },
    update: {
      domain: TEST_WORKSPACE.program.domain,
    },
  });

  await prisma.project.update({
    where: {
      id: workspaceId,
    },
    data: {
      defaultProduct: "program",
      defaultProgramId: program.id,
      partnersLimit: 1000,
      ...(didCreateFolder && {
        foldersUsage: {
          increment: 1,
        },
      }),
    },
  });

  return {
    programId: program.id,
    defaultGroupId: group.id,
  };
}
