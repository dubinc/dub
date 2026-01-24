import { createId } from "@/lib/api/create-id";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@dub/prisma";
import {
  Domain,
  Folder,
  Integration,
  Partner,
  PartnerGroup,
  Prisma,
  Program,
  Project,
  Reward,
  User,
  WorkspaceRole,
} from "@dub/prisma/client";
import "dotenv-flow/config";
import fs from "fs";
import path from "path";
import readline from "readline";

type Workspace = Pick<
  Project,
  | "id"
  | "name"
  | "slug"
  | "plan"
  | "billingCycleStart"
  | "usageLimit"
  | "linksLimit"
  | "payoutsLimit"
  | "domainsLimit"
  | "tagsLimit"
  | "foldersLimit"
  | "usersLimit"
  | "aiLimit"
  | "groupsLimit"
  | "defaultProgramId"
  | "invoicePrefix"
  | "conversionEnabled"
  | "webhookEnabled"
  | "dotLinkClaimed"
  | "fastDirectDebitPayouts"
>;

type DomainSeed = Pick<Domain, "id" | "slug" | "verified">;

type FolderSeed = Pick<Folder, "id" | "name" | "description" | "accessLevel">;

type RewardSeed = Pick<
  Reward,
  | "id"
  | "programId"
  | "event"
  | "type"
  | "amountInCents"
  | "amountInPercentage"
  | "maxDuration"
  | "description"
  | "tooltipDescription"
>;

type GroupSeed = Pick<
  PartnerGroup,
  "id" | "name" | "slug" | "color" | "leadRewardId" | "saleRewardId"
>;

type ProgramSeed = Omit<
  Pick<
    Program,
    | "id"
    | "name"
    | "slug"
    | "defaultFolderId"
    | "defaultGroupId"
    | "domain"
    | "url"
    | "termsUrl"
    | "helpUrl"
    | "supportEmail"
    | "messagingEnabledAt"
    | "partnerNetworkEnabledAt"
  >,
  "messagingEnabledAt" | "partnerNetworkEnabledAt"
> & {
  messagingEnabledAt: string;
  partnerNetworkEnabledAt: string;
};

interface WorkspaceUser extends Pick<User, "id" | "name" | "email"> {
  emailVerified: string;
  role: WorkspaceRole;
}

type PartnerSeed = Pick<
  Partner,
  "id" | "name" | "email" | "description" | "country"
> & {
  createdAt: string;
  user: Pick<User, "id" | "name" | "email"> & {
    emailVerified: string;
  };
};

type SeedData = {
  workspace: Workspace;
  users: WorkspaceUser[];
  domains: DomainSeed[];
  folders: FolderSeed[];
  rewards: RewardSeed[];
  groups: GroupSeed[];
  program: ProgramSeed;
  partners: PartnerSeed[];
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

// Create rewards
const createRewards = async (data: SeedData) => {
  const { rewards, program } = data;

  if (!rewards || rewards.length === 0) {
    console.log("No rewards to insert");
    return;
  }

  if (!program) {
    console.log("Program is required to create rewards");
    return;
  }

  const { count } = await prisma.reward.createMany({
    data: rewards.map((reward) => ({
      id: reward.id,
      programId: program.id,
      event: reward.event,
      type: reward.type,
      amountInCents: reward.amountInCents,
      amountInPercentage: reward.amountInPercentage
        ? new Prisma.Decimal(reward.amountInPercentage)
        : null,
      maxDuration: reward.maxDuration,
      description: reward.description,
      tooltipDescription: reward.tooltipDescription,
    })),
  });

  console.log(`Created ${count} rewards`);
};

// Create groups
const createGroups = async (data: SeedData) => {
  const { groups, program } = data;

  if (!groups || groups.length === 0) {
    console.log("No groups to insert");
    return;
  }

  if (!program) {
    console.log("Program is required to create groups");
    return;
  }

  const { count } = await prisma.partnerGroup.createMany({
    data: groups.map((group) => ({
      id: group.id,
      programId: program.id,
      name: group.name,
      slug: group.slug,
      color: group.color ?? null,
      leadRewardId: group.leadRewardId ?? null,
      saleRewardId: group.saleRewardId ?? null,
    })),
  });

  console.log(`Created ${count} groups`);
};

// Create program
const createProgram = async (data: SeedData) => {
  const { program, workspace } = data;

  if (!program) {
    console.log("No program to insert");
    return;
  }

  const { id } = await prisma.program.create({
    data: {
      id: program.id,
      workspaceId: workspace.id,
      name: program.name,
      slug: program.slug,
      defaultFolderId: program.defaultFolderId,
      defaultGroupId: program.defaultGroupId,
      domain: program.domain,
      url: program.url,
      termsUrl: program.termsUrl,
      helpUrl: program.helpUrl,
      supportEmail: program.supportEmail,
      messagingEnabledAt: new Date(),
      partnerNetworkEnabledAt: new Date(),
      addedToMarketplaceAt: new Date(),
      featuredOnMarketplaceAt: new Date(),
    },
  });

  console.log(`Created program ${id}`);
};

// Create partners
const createPartners = async (data: SeedData) => {
  const { partners, program } = data;

  if (!partners || partners.length === 0) {
    console.log("No partners to insert");
    return;
  }

  if (!program) {
    console.log("Program is required to create partners.");
    return;
  }

  const passwordHash = await hashPassword("password");

  // Create users for partners
  await prisma.user.createMany({
    data: partners.map((partner) => ({
      id: partner.user.id,
      name: partner.user.name,
      email: partner.user.email,
      emailVerified: new Date(partner.user.emailVerified),
      passwordHash,
      defaultPartnerId: partner.id,
    })),
  });

  // Create partners
  const { count: partnerCount } = await prisma.partner.createMany({
    data: partners.map((partner) => ({
      id: partner.id,
      name: partner.name,
      email: partner.email,
      description: partner.description,
      country: partner.country,
      createdAt: new Date(partner.createdAt),
    })),
  });

  // Create partner users
  await prisma.partnerUser.createMany({
    data: partners.map((partner) => ({
      userId: partner.user.id,
      partnerId: partner.id,
      role: "owner",
      createdAt: new Date(partner.createdAt),
    })),
  });

  console.log(`Created ${partnerCount} partners`);

  // Create program enrollments
  const { count: enrollmentCount } = await prisma.programEnrollment.createMany({
    data: partners.map((partner) => ({
      id: createId({ prefix: "pge_" }),
      partnerId: partner.id,
      programId: program.id,
      groupId: program.defaultGroupId,
    })),
  });

  console.log(`Created ${enrollmentCount} program enrollments`);
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

  // First, nullify the defaultProgramId references to break the relation
  await prisma.project.updateMany({
    data: {
      defaultProgramId: null,
    },
  });

  const tables = [
    "InstalledIntegration",
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
    "Integration",
    "Commission",
    "PartnerComment",
    "Payout",
    "Invoice",
    "Customer",
    "Reward",
    "DiscountCode",
    "Discount",
    "FolderAccessRequest",
    "EmailDomain",
    "Message",
    "PartnerGroupDefaultLink",
    "FolderUser",
    "Folder",
    "Link",
    "Workflow",
    "BountyGroup",
    "BountySubmission",
    "Bounty",
    "CampaignGroup",
    "Campaign",
    "ProgramApplication",
    "ProgramEnrollment",
    "PartnerGroup",
    "PartnerUser",
    "Partner",
    "PartnerInvite",
    "Domain",
    "ProjectUsers",
    "User",
    "Program",
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

// Ask for confirmation - requires typing "YES DELETE DATA"
const askConfirmation = (question: string): Promise<boolean> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      `${question}\nType "YES DELETE DATA" to confirm: `,
      (answer) => {
        rl.close();
        resolve(answer === "YES DELETE DATA");
      },
    );
  });
};

async function main() {
  // Check for --truncate flag
  // process.argv[0] = node, process.argv[1] = script path, process.argv[2+] = arguments
  const shouldTruncate = process.argv.slice(2).includes("--truncate");

  if (shouldTruncate) {
    console.log(
      "\n⚠️  WARNING: This will delete ALL data from the database.\n",
    );
    console.log("⚠️  Make sure you are NOT on production database!\n");
    const confirmed = await askConfirmation(
      "Are you sure you want to delete ALL data from the database?",
    );

    if (!confirmed) {
      console.log("\nTruncate canceled. Exiting...");
      process.exit(0);
    }

    console.log("\n");
    await truncate();
    console.log("\n");
  }

  const data = parseJSON();

  await createWorkspace(data);
  await createUsers(data);
  await createDomains(data);
  await createFolders(data);
  await createProgram(data);
  await createRewards(data);
  await createGroups(data);
  await createPartners(data);
  await createIntegrations(data);
}

main();
