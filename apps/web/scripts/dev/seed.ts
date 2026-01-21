import { createId } from "@/lib/api/create-id";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@dub/prisma";
import {
  Domain,
  Folder,
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
  folders?: FolderSeed[];
  rewards?: RewardSeed[];
  groups?: GroupSeed[];
  program?: ProgramSeed;
  partners?: PartnerSeed[];
};

const parseJSON = (): SeedData => {
  const jsonPath = path.join(__dirname, "data.json");
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  return jsonData;
};

// Create workspace
const createWorkspace = async ({
  workspace,
}: {
  workspace: Prisma.ProjectCreateInput;
}) => {
  const { id } = await prisma.project.create({
    data: workspace,
  });

  console.log(`Created workspace ${id}`);
};

// Create users
const createUsers = async ({
  workspace,
  users,
}: {
  workspace: Pick<Project, "id">;
  users: WorkspaceUser[];
}) => {
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

  const { count: notificationPreferencesCount } =
    await prisma.notificationPreference.createMany({
      data: users.map((user) => ({
        projectUserId: user.id,
      })),
    });

  console.log(
    `Created ${notificationPreferencesCount} notification preferences`,
  );
};

// Create domains
const createDomains = async ({
  domains,
  workspace,
}: {
  domains: DomainSeed[];
  workspace: Pick<Project, "id">;
}) => {
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
const createFolders = async ({
  folders,
  workspace,
}: {
  folders?: FolderSeed[];
  workspace: Pick<Project, "id">;
}) => {
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
const createRewards = async ({
  rewards,
  program,
}: {
  rewards?: RewardSeed[];
  program?: ProgramSeed;
}) => {
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
const createGroups = async ({
  groups,
  program,
}: {
  groups?: GroupSeed[];
  program?: ProgramSeed;
}) => {
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
const createProgram = async ({
  program,
  workspace,
}: {
  program?: ProgramSeed;
  workspace: Pick<Project, "id">;
}) => {
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
      messagingEnabledAt: new Date(program.messagingEnabledAt),
      partnerNetworkEnabledAt: new Date(program.partnerNetworkEnabledAt),
      addedToMarketplaceAt: new Date(),
      featuredOnMarketplaceAt: new Date(),
    },
  });

  console.log(`Created program ${id}`);
};

// Create partners
const createPartners = async ({
  partners,
  program,
}: {
  partners?: PartnerSeed[];
  program?: ProgramSeed;
}) => {
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
  const { count: userCount } = await prisma.user.createMany({
    data: partners.map((partner) => ({
      id: partner.user.id,
      name: partner.user.name,
      email: partner.user.email,
      emailVerified: new Date(partner.user.emailVerified),
      passwordHash,
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
  const { count: partnerUserCount } = await prisma.partnerUser.createMany({
    data: partners.map((partner) => ({
      userId: partner.user.id,
      partnerId: partner.id,
      role: "owner",
      createdAt: new Date(partner.createdAt),
    })),
  });

  // Create partner notification preferences
  const { count: notificationPreferencesCount } =
    await prisma.partnerNotificationPreferences.createMany({
      data: partners.map((partner) => ({
        partnerUserId: partner.user.id,
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

async function main() {
  const data = parseJSON();

  await createWorkspace({
    workspace: data.workspace,
  });

  await createUsers({
    workspace: data.workspace,
    users: data.users,
  });

  await createDomains({
    domains: data.domains,
    workspace: data.workspace,
  });

  await createFolders({
    folders: data.folders,
    workspace: data.workspace,
  });

  await createProgram({
    program: data.program,
    workspace: data.workspace,
  });

  await createRewards({
    rewards: data.rewards,
    program: data.program,
  });

  await createGroups({
    groups: data.groups,
    program: data.program,
  });

  await createPartners({
    partners: data.partners,
    program: data.program,
  });
}

main();
