import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import {
  Domain,
  Folder,
  Integration,
  Prisma,
  Project,
  User,
  WorkspaceRole,
} from "@prisma/client";
import "dotenv-flow/config";
import fs from "fs";
import path from "path";
import { assertLocalDatabaseEnv } from "../../playwright/assert-local-database";

type Workspace = Pick<
  Project,
  | "id"
  | "name"
  | "slug"
  | "plan"
  | "logo"
  | "billingCycleStart"
  | "usageLimit"
  | "linksLimit"
  | "domainsLimit"
  | "tagsLimit"
  | "foldersLimit"
  | "usersLimit"
  | "aiLimit"
  | "invoicePrefix"
  | "conversionEnabled"
  | "webhookEnabled"
  | "dotLinkClaimed"
  | "publishableKey"
>;

type DomainSeed = Pick<Domain, "id" | "slug" | "verified">;

type FolderSeed = Pick<Folder, "id" | "name" | "description" | "accessLevel">;

interface WorkspaceUser extends Pick<User, "id" | "name" | "email"> {
  emailVerified: string;
  role: WorkspaceRole;
}

type SeedData = {
  workspace: Workspace;
  users: WorkspaceUser[];
  domains: DomainSeed[];
  folders: FolderSeed[];
  integrations: Omit<
    Integration,
    "id" | "projectId" | "userId" | "createdAt" | "updatedAt"
  >[];
};

const parseJSON = (): SeedData => {
  const jsonPath = path.join(__dirname, "data.json");
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  return jsonData;
};

// Create workspace
const createWorkspace = async (data: SeedData) => {
  const { workspace } = data;

  const { id } = await prisma.project.create({
    data: workspace,
  });

  console.log(`Created workspace ${id}`);
};

// Create users
const createUsers = async (data: SeedData) => {
  const { workspace, users } = data;

  if (!users || users.length === 0) {
    console.log("No users to insert");
    return;
  }

  const passwordHash = await hashPassword("password");

  const { count } = await prisma.user.createMany({
    data: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: new Date(user.emailVerified),
      passwordHash,
    })),
  });

  console.log(`Created ${count} users`);

  const { count: projectUsersCount } = await prisma.projectUsers.createMany({
    data: users.map((user) => ({
      projectId: workspace.id,
      userId: user.id,
      role: user.role,
    })),
  });

  console.log(`Created ${projectUsersCount} project users`);

  // Query ProjectUsers to get the actual IDs (since createMany doesn't return them)
  const projectUsers = await prisma.projectUsers.findMany({
    where: {
      projectId: workspace.id,
      userId: { in: users.map((u) => u.id) },
    },
  });

  // Map userId -> projectUser.id
  const userIdToProjectUserId = new Map(
    projectUsers.map((pu) => [pu.userId, pu.id]),
  );

  const { count: notificationPreferencesCount } =
    await prisma.notificationPreference.createMany({
      data: users.map((user) => ({
        projectUserId: userIdToProjectUserId.get(user.id)!,
      })),
    });

  console.log(
    `Created ${notificationPreferencesCount} notification preferences`,
  );
};

// Create domains
const createDomains = async (data: SeedData) => {
  const { domains, workspace } = data;

  if (!domains || domains.length === 0) {
    console.log("No domains to insert");
    return;
  }

  const { count } = await prisma.domain.createMany({
    data: domains.map((domain) => ({
      id: domain.id,
      slug: domain.slug,
      verified: domain.verified,
      projectId: workspace.id,
    })),
  });

  console.log(`Created ${count} domains`);
};

// Create folders
const createFolders = async (data: SeedData) => {
  const { folders, workspace } = data;

  if (!folders || folders.length === 0) {
    console.log("No folders to insert");
    return;
  }

  const { count } = await prisma.folder.createMany({
    data: folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      description: folder.description,
      projectId: workspace.id,
      accessLevel: folder.accessLevel,
    })),
  });

  console.log(`Created ${count} folders`);
};

// Create integrations
const createIntegrations = async (data: SeedData) => {
  const { integrations, workspace } = data;

  if (!integrations || integrations.length === 0) {
    console.log("No integrations to insert");
    return;
  }

  const { count } = await prisma.integration.createMany({
    data: integrations.map((integration) => ({
      ...integration,
      projectId: workspace.id,
      screenshots: integration.screenshots
        ? (integration.screenshots as Prisma.JsonArray)
        : undefined,
      verified: Boolean(integration.verified),
      comingSoon: Boolean(integration.comingSoon),
    })),
  });

  console.log(`Created ${count} integrations`);
};

// Delete in order of dependencies
const truncate = async () => {
  console.log("Truncating database...\n");

  const tables = [
    "Job",
    "jackson_index",
    "jackson_store",
    "jackson_ttl",
    "OAuthCode",
    "OAuthApp",
    "InstalledIntegration",
    "FolderWebhook",
    "LinkWebhook",
    "Webhook",
    "UtmTemplate",
    "LinkTag",
    "Tag",
    "Token",
    "RestrictedToken",
    "OAuthRefreshToken",
    "PasswordResetToken",
    "VerificationToken",
    "EmailVerificationToken",
    "NotificationPreference",
    "UserNotificationPreferences",
    "Integration",
    "Invoice",
    "Customer",
    "FolderAccessRequest",
    "FolderUser",
    "Folder",
    "Link",
    "Domain",
    "Account",
    "Session",
    "Dashboard",
    "ProjectUsers",
    "User",
    "RegisteredDomain",
    "DefaultDomains",
    "ProjectInvite",
    "SentEmail",
    "YearInReview",
    "Project",
  ];

  const total = tables.length;
  const errors: string[] = [];

  for (let i = 0; i < tables.length; i++) {
    const tableName = tables[i];
    try {
      process.stdout.write(`\r[${i + 1}/${total}] Truncating ${tableName}...`);
      // Use TRUNCATE for each table separately (MySQL/PlanetScale syntax)
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${tableName}\`;`);
    } catch (error: any) {
      errors.push(
        `${tableName}: ${error.message || error.code || "Unknown error"}`,
      );
      process.stdout.write(
        `\r[${i + 1}/${total}] Skipping ${tableName} (error occurred)...`,
      );
    }
  }

  console.log("\n");

  if (errors.length > 0) {
    console.log("⚠️  Some tables had errors during truncation:");
    errors.forEach((error) => console.log(`  - ${error}`));
    console.log("");
  }

  console.log("Database truncated successfully");
};

async function main() {
  assertLocalDatabaseEnv();

  // Check for --truncate flag
  // process.argv[0] = node, process.argv[1] = script path, process.argv[2+] = arguments
  const shouldTruncate = process.argv.slice(2).includes("--truncate");

  if (shouldTruncate) {
    await truncate();
    console.log("\n");
  }

  const data = parseJSON();

  await createWorkspace(data);
  await createUsers(data);
  await createDomains(data);
  await createFolders(data);
  await createIntegrations(data);
}

main();
