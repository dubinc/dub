import { prisma } from "@dub/prisma";
import { hash } from "bcryptjs";
import "dotenv-flow/config";
import { RBAC_PASSWORD, RBAC_USERS } from "./partners/rbac-constants";

async function getWorkspaceData(slug: string) {
  const workspace = await prisma.project.findUniqueOrThrow({
    where: { slug },
    select: {
      id: true,
      programs: {
        select: {
          id: true,
          domain: true,
          defaultFolderId: true,
          defaultGroupId: true,
        },
        take: 1,
      },
    },
  });

  const program = workspace.programs[0];
  if (!program) {
    throw new Error(`No program found for workspace "${slug}"`);
  }

  return {
    workspaceId: workspace.id,
    programId: program.id,
    groupId: program.defaultGroupId,
    folderId: program.defaultFolderId,
    domain: program.domain!,
  };
}

const PARTNER = {
  name: "RBAC Test Partner",
  email: "partner+rbac@dub-internal-test.com",
  country: "US",
};

async function main() {
  // Query workspace data from the database
  const ACME = await getWorkspaceData("acme");
  const EXAMPLE = await getWorkspaceData("example");

  console.log("Resolved workspace data:", { ACME, EXAMPLE });

  const passwordHash = await hash(RBAC_PASSWORD, 12);

  // Step 1: Create 3 users
  const users: Record<
    string,
    Awaited<ReturnType<typeof prisma.user.upsert>>
  > = {};

  for (const [role, { email, name }] of Object.entries(RBAC_USERS)) {
    users[role] = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name,
        emailVerified: new Date(),
        passwordHash,
      },
    });
  }

  console.log(
    "Created users:",
    Object.fromEntries(
      Object.entries(users).map(([role, user]) => [role, user.id]),
    ),
  );

  // Step 2: Create partner
  const partner = await prisma.partner.upsert({
    where: { email: PARTNER.email },
    update: {},
    create: {
      name: PARTNER.name,
      email: PARTNER.email,
      country: PARTNER.country,
    },
  });

  console.log("Created partner:", partner.id);

  // Step 3: Create PartnerUser records
  const PARTNER_USER_CONFIG = {
    owner: { role: "owner", programAccess: "all" },
    member: { role: "member", programAccess: "restricted" },
    viewer: { role: "viewer", programAccess: "all" },
  } as const;

  const partnerUsers: Record<
    string,
    Awaited<ReturnType<typeof prisma.partnerUser.upsert>>
  > = {};

  for (const [role, config] of Object.entries(PARTNER_USER_CONFIG)) {
    partnerUsers[role] = await prisma.partnerUser.upsert({
      where: {
        userId_partnerId: {
          userId: users[role].id,
          partnerId: partner.id,
        },
      },
      update: {},
      create: {
        userId: users[role].id,
        partnerId: partner.id,
        role: config.role,
        programAccess: config.programAccess,
      },
    });
  }

  console.log(
    "Created partner users:",
    Object.fromEntries(
      Object.entries(partnerUsers).map(([role, pu]) => [role, pu.id]),
    ),
  );

  // Step 4: Set defaultPartnerId on all users
  await Promise.all(
    Object.values(users).map((user) =>
      prisma.user.update({
        where: { id: user.id },
        data: { defaultPartnerId: partner.id },
      }),
    ),
  );

  // Step 5: Create program enrollments
  const acmeEnrollment = await prisma.programEnrollment.upsert({
    where: {
      partnerId_programId: {
        partnerId: partner.id,
        programId: ACME.programId,
      },
    },
    update: {},
    create: {
      partnerId: partner.id,
      programId: ACME.programId,
      groupId: ACME.groupId,
      status: "approved",
    },
  });

  const exampleEnrollment = await prisma.programEnrollment.upsert({
    where: {
      partnerId_programId: {
        partnerId: partner.id,
        programId: EXAMPLE.programId,
      },
    },
    update: {},
    create: {
      partnerId: partner.id,
      programId: EXAMPLE.programId,
      groupId: EXAMPLE.groupId,
      status: "approved",
    },
  });

  console.log("Created enrollments:", {
    acme: acmeEnrollment.id,
    example: exampleEnrollment.id,
  });

  // Step 6: Create 4 links (2 per program)
  const LINK_DEFS = [
    { key: "rbac-acme-link-1", url: "https://acme.com/ref1", ws: ACME },
    { key: "rbac-acme-link-2", url: "https://acme.com/ref2", ws: ACME },
    {
      key: "rbac-example-link-1",
      url: "https://example.com/ref1",
      ws: EXAMPLE,
    },
    {
      key: "rbac-example-link-2",
      url: "https://example.com/ref2",
      ws: EXAMPLE,
    },
  ];

  const links: Record<
    string,
    Awaited<ReturnType<typeof prisma.link.upsert>>
  > = {};

  for (const { key, url, ws } of LINK_DEFS) {
    links[key] = await prisma.link.upsert({
      where: {
        domain_key: {
          domain: ws.domain,
          key,
        },
      },
      update: {},
      create: {
        domain: ws.domain,
        key,
        url,
        shortLink: `https://${ws.domain}/${key}`,
        projectId: ws.workspaceId,
        programId: ws.programId,
        partnerId: partner.id,
        folderId: ws.folderId,
        trackConversion: true,
      },
    });
  }

  console.log(
    "Created links:",
    Object.fromEntries(
      Object.entries(links).map(([key, link]) => [key, link.id]),
    ),
  );

  // Step 7: Assign Acme program to member (restricted access)
  await prisma.partnerUserProgram.upsert({
    where: {
      partnerUserId_programId: {
        partnerUserId: partnerUsers.member.id,
        programId: ACME.programId,
      },
    },
    update: {},
    create: {
      partnerUserId: partnerUsers.member.id,
      programId: ACME.programId,
    },
  });

  console.log("Assigned Acme program to member");

  // Step 8: Assign only rbac-acme-link-1 to member
  await prisma.partnerUserLink.upsert({
    where: {
      partnerUserId_linkId: {
        partnerUserId: partnerUsers.member.id,
        linkId: links["rbac-acme-link-1"].id,
      },
    },
    update: {},
    create: {
      partnerUserId: partnerUsers.member.id,
      linkId: links["rbac-acme-link-1"].id,
      programId: ACME.programId,
    },
  });

  console.log("Assigned rbac-acme-link-1 to member");

  console.log("\nRBAC seed complete!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
