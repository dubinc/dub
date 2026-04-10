import "dotenv-flow/config";

import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import { PartnerRole } from "@dub/prisma/client";
import { hashSync } from "bcryptjs";
import {
  PARTNER,
  PARTNER_LINKS,
  PARTNER_PROGRAMS,
  PARTNER_USERS,
  PASSWORD,
} from "./partners/constants";

async function main() {
  // Upsert partner
  const partner = await prisma.partner.upsert({
    where: {
      email: PARTNER.email,
    },
    update: {},
    create: {
      id: createId({ prefix: "pn_" }),
      name: PARTNER.name,
      email: PARTNER.email,
      country: PARTNER.country,
    },
  });

  const partnerUsers: Record<
    string,
    Awaited<ReturnType<typeof prisma.partnerUser.upsert>>
  > = {};

  // Upsert partner users
  for (const [role, { email, name, programAccess }] of Object.entries(
    PARTNER_USERS,
  )) {
    const user = await prisma.user.upsert({
      where: {
        email,
      },
      update: {},
      create: {
        id: createId({ prefix: "user_" }),
        email,
        name,
        emailVerified: new Date(),
        passwordHash: hashSync(PASSWORD, 10),
        defaultPartnerId: partner.id,
      },
    });

    partnerUsers[role] = await prisma.partnerUser.upsert({
      where: {
        userId_partnerId: {
          userId: user.id,
          partnerId: partner.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        partnerId: partner.id,
        role: role as PartnerRole,
        programAccess,
      },
    });
  }

  // Upsert program enrollments
  const programs = await prisma.program.findMany({
    where: {
      slug: {
        in: PARTNER_PROGRAMS,
      },
    },
    include: {
      groups: true,
    },
  });

  for (const program of programs) {
    const defaultGroup = program.groups.find(
      (group) => group.slug === "default",
    );

    if (!defaultGroup) {
      throw new Error("Default group not found");
    }

    await prisma.programEnrollment.upsert({
      where: {
        partnerId_programId: {
          partnerId: partner.id,
          programId: program.id,
        },
      },
      update: {},
      create: {
        id: createId({ prefix: "pge_" }),
        partnerId: partner.id,
        programId: program.id,
        status: "approved",
        groupId: defaultGroup.id,
        clickRewardId: defaultGroup.clickRewardId,
        leadRewardId: defaultGroup.leadRewardId,
        saleRewardId: defaultGroup.saleRewardId,
        discountId: defaultGroup.discountId,
      },
    });
  }

  const links: Record<
    string,
    Awaited<ReturnType<typeof prisma.link.upsert>>
  > = {};

  // Upsert links
  for (const program of programs) {
    const partnerLinks =
      PARTNER_LINKS[program.slug as keyof typeof PARTNER_LINKS];

    for (const partnerLink of partnerLinks) {
      links[partnerLink.key] = await prisma.link.upsert({
        where: {
          domain_key: {
            domain: program.domain!,
            key: partnerLink.key,
          },
        },
        update: {},
        create: {
          id: createId({ prefix: "link_" }),
          domain: program.domain!,
          key: partnerLink.key,
          url: partnerLink.url,
          shortLink: `https://${program.domain!}/${partnerLink.key}`,
          projectId: program.workspaceId,
          programId: program.id,
          partnerId: partner.id,
          folderId: program.defaultFolderId,
          trackConversion: true,
        },
      });
    }
  }

  const programsBySlug = new Map(
    programs.map((program) => [program.slug, program.id]),
  );

  // Assign Acme program to member (restricted access)
  await prisma.partnerUserProgram.upsert({
    where: {
      partnerUserId_programId: {
        partnerUserId: partnerUsers.member.id,
        programId: programsBySlug.get("acme")!,
      },
    },
    update: {},
    create: {
      partnerUserId: partnerUsers.member.id,
      programId: programsBySlug.get("acme")!,
    },
  });

  // Assign only acme-link-1 to member
  await prisma.partnerUserLink.upsert({
    where: {
      partnerUserId_linkId: {
        partnerUserId: partnerUsers.member.id,
        linkId: links["acme-link-1"].id,
      },
    },
    update: {},
    create: {
      partnerUserId: partnerUsers.member.id,
      linkId: links["acme-link-1"].id,
      programId: programsBySlug.get("acme")!,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
