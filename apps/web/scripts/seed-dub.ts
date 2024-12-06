import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import {
  getCurrentPlan,
  SEGMENT_INTEGRATION_ID,
  // SEGMENT_INTEGRATION_ID,
  SLACK_INTEGRATION_ID,
} from "@dub/utils";
import { CommissionType, PartnerStatus } from "@prisma/client";
import "dotenv-flow/config";

// API key: dub_z9hYP0dLXJ0SV6YMuVb2LS3m

const workspace = {
  id: "cl7pj5kq4006835rbjlt2ofka",
  slug: "acme",
  name: "Acme",
  logo: "https://dubassets.com/logos/clrei1gld0002vs9mzn93p8ik_384uSfo",
  plan: "business",
  conversionEnabled: true,
  linksLimit: 5000,
  tagsLimit: 100,
};

const workspaceUser = {
  id: "cm1ypncqa0000tc44pfgxp6qs",
  name: "Kiran",
  email: "kiran@dub.co",
  emailVerified: new Date(),
  password: "password",
  defaultWorkspace: workspace.slug,
};

const partnerUser = {
  id: "cm1ypncqa0000tc44pfgxp6q1",
  name: "Jack David",
  email: "jack@dub.co",
  emailVerified: new Date(),
  password: "password",
};

const partner = {
  id: "pn_cm3pp3zwl0000nym49hpgpzxq", // should start with pn_
  name: "Jack David",
  country: "US",
  status: "verified" as PartnerStatus,
  image:
    "https://dubassets.com/partners/pn_H4TB2V5hDIjpqB7PwrxESoY3/image_BrWvlVT",
};

const domain = {
  slug: "cal.com",
  verified: true,
  primary: true,
  projectId: workspace.id,
};

const program = {
  id: "prog_CYCu7IMAapjkRpTnr8F1azjN",
  workspaceId: workspace.id,
  name: "Cal",
  slug: "cal",
  logo: "https://cal.com/logo.svg",
  commissionAmount: 10,
  commissionType: "percentage",
  domain: domain.slug,
  url: "https://cal.com",
};

const tags = [
  {
    name: "Sales",
    color: "red",
    projectId: workspace.id,
  },
  {
    name: "Marketing",
    color: "blue",
    projectId: workspace.id,
  },
  {
    name: "Partners",
    color: "green",
    projectId: workspace.id,
  },
];

const integrations = [
  {
    name: "Zapier",
    slug: "zapier",
    description:
      "Official Zapier integration for Dub. Shorten and manage your links directly in Zapier.",
    installUrl: "https://zapier.com/apps/dub/integrations",
  },
  {
    id: SLACK_INTEGRATION_ID,
    name: "Slack",
    slug: "slack",
    description:
      "Official Slack integration for Dub. Shorten and manage your links directly in Slack.",
    installUrl: "https://dub.co/slack",
  },
  {
    id: SEGMENT_INTEGRATION_ID,
    name: "Segment",
    slug: "segment",
    description:
      "Official Segment integration for Dub. Track your links and events in Segment.",
    developer: "Dub",
    installUrl: "https://dub.co/segment",
  },
];

async function main() {
  // await cleanUp();

  // await createUser();
  // await createWorkspace();
  // await createApiKey();
  // await createTags();

  // await createProgram();
  // await createPartner();
  // await createProgramEnrollment();

  await createIntegrations();
}

const createUser = async () => {
  await prisma.user.create({
    data: {
      id: workspaceUser.id,
      name: workspaceUser.name,
      email: workspaceUser.email,
      emailVerified: workspaceUser.emailVerified,
      passwordHash: await hashPassword(workspaceUser.password),
      defaultWorkspace: workspaceUser.defaultWorkspace,
    },
  });
};

const createWorkspace = async () => {
  await prisma.project.create({
    data: {
      ...workspace,
      billingCycleStart: 1,
    },
  });

  await prisma.projectUsers.create({
    data: {
      userId: workspaceUser.id,
      projectId: workspace.id,
      role: "owner",
    },
  });
};

const createDomain = async () => {
  await prisma.domain.create({
    data: {
      ...domain,
    },
  });
};

const createTags = async () => {
  await prisma.tag.createMany({
    data: tags,
  });
};

const createApiKey = async () => {
  await prisma.restrictedToken.create({
    data: {
      name: "Local",
      hashedKey:
        "1a169c16acec5ce9c17fdee1276439c50fee9cff96772a1ab1e07524a8fd93b4",
      partialKey: "dub...LS3m",
      userId: workspaceUser.id,
      projectId: workspace.id,
      rateLimit: getCurrentPlan(workspace.plan).limits.api,
      scopes: "apis.all",
    },
  });
};

const createProgram = async () => {
  await prisma.program.create({
    data: {
      id: program.id,
      workspaceId: workspace.id,
      name: program.name,
      slug: program.slug,
      logo: program.logo,
      commissionAmount: program.commissionAmount,
      commissionType: program.commissionType as CommissionType,
      domain: program.domain,
      url: program.url,
    },
  });
};

const createPartner = async () => {
  await prisma.user.create({
    data: {
      id: partnerUser.id,
      name: partnerUser.name,
      email: partnerUser.email,
      emailVerified: partnerUser.emailVerified,
      passwordHash: await hashPassword(partnerUser.password),
    },
  });

  await prisma.partner.create({
    data: {
      ...partner,
    },
  });

  await prisma.partnerUser.create({
    data: {
      userId: partnerUser.id,
      partnerId: partner.id,
    },
  });
};

const createProgramEnrollment = async () => {
  await prisma.programEnrollment.create({
    data: {
      programId: program.id,
      partnerId: partner.id,
      status: "approved",
    },
  });
};

const createIntegrations = async () => {
  const response = await prisma.integration.createMany({
    data: integrations.map((integration) => ({
      ...integration,
      projectId: workspace.id,
      website: "https://dub.co",
      verified: true,
      userId: workspaceUser.id,
      developer: "Dub",
    })),
  });

  console.log(response);
};

// Clean up for a fresh start
const cleanUp = async () => {
  await prisma.projectUsers.deleteMany();
  await prisma.user.deleteMany();

  await prisma.payout.deleteMany();
  await prisma.sale.deleteMany();

  await prisma.programEnrollment.deleteMany();
  await prisma.partnerUser.deleteMany();
  await prisma.partner.deleteMany();

  await prisma.program.deleteMany();
  await prisma.project.deleteMany();

  await prisma.integration.deleteMany();
};

main();
