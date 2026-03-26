import "dotenv-flow/config";

import { prisma } from "@dub/prisma";
import { hashSync } from "bcryptjs";
import { E2E_DASHBOARD } from "./e2e-dashboard-constants";

const E2E_PARTNER = {
  name: "Partner 1",
  email: "partner1@dub-internal-test.com",
  password: "password",
};

async function main() {
  const passwordHash = hashSync(E2E_PARTNER.password, 10);
  const dashboardPasswordHash = hashSync(E2E_DASHBOARD.password, 10);

  const user = await prisma.user.upsert({
    where: {
      email: E2E_PARTNER.email,
    },
    update: {},
    create: {
      email: E2E_PARTNER.email,
      name: E2E_PARTNER.name,
      emailVerified: new Date(),
      passwordHash,
    },
  });

  const partner = await prisma.partner.upsert({
    where: {
      email: E2E_PARTNER.email,
    },
    update: {},
    create: {
      name: E2E_PARTNER.name,
      email: E2E_PARTNER.email,
      country: "US",
      users: {
        create: {
          userId: user.id,
          role: "owner",
        },
      },
    },
  });

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      defaultPartnerId: partner.id,
    },
  });

  const dashboardUser = await prisma.user.upsert({
    where: {
      email: E2E_DASHBOARD.email,
    },
    update: {
      passwordHash: dashboardPasswordHash,
      emailVerified: new Date(),
    },
    create: {
      email: E2E_DASHBOARD.email,
      name: E2E_DASHBOARD.name,
      emailVerified: new Date(),
      passwordHash: dashboardPasswordHash,
      createdAt: new Date("2020-01-01T00:00:00.000Z"),
    },
  });

  let project = await prisma.project.findUnique({
    where: { slug: E2E_DASHBOARD.workspaceSlug },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        name: E2E_DASHBOARD.workspaceName,
        slug: E2E_DASHBOARD.workspaceSlug,
        billingCycleStart: 1,
        plan: "free",
      },
    });
  }

  await prisma.projectUsers.upsert({
    where: {
      userId_projectId: {
        userId: dashboardUser.id,
        projectId: project.id,
      },
    },
    update: {
      role: "owner",
    },
    create: {
      userId: dashboardUser.id,
      projectId: project.id,
      role: "owner",
    },
  });

  await prisma.user.update({
    where: { id: dashboardUser.id },
    data: {
      defaultWorkspace: E2E_DASHBOARD.workspaceSlug,
    },
  });

  console.log("Seeded test partner:", {
    userId: user.id,
    partnerId: partner.id,
  });

  console.log("Seeded dashboard billing E2E user:", {
    userId: dashboardUser.id,
    workspaceSlug: E2E_DASHBOARD.workspaceSlug,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
