import { createId } from "@/lib/api/create-id";
import { hashToken } from "@/lib/auth/hash-token";
import { prisma } from "@/lib/prisma";
import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import { ProgramEnrollmentStatus } from "@prisma/client";
import { createBearerApiClient, test } from "../fixtures";
import { createPartner, deletePartner } from "../partners/helpers";

type PartnerProfileBounty = {
  id: string;
  partner: { totalClicks: number; totalSaleAmount: number };
  program: { id: string; name: string; slug: string };
};

const day = 24 * 60 * 60 * 1000;

test.describe("GET /partner-profile/bounties", () => {
  let partnerId: string | undefined;
  let userId: string | undefined;
  let token: string;

  // each program is in its own workspace
  const suffix = nanoid(8).toLowerCase();
  const programs = [
    { name: "Approved", status: "approved" },
    { name: "Archived", status: "archived" },
    { name: "Banned", status: "banned" },
    // an approved enrollment in a deactivated program
    { name: "Deactivated", status: "approved", deactivatedAt: new Date() },
  ].map((program, i) => ({
    ...program,
    name: `PWB ${suffix} ${program.name}`,
    status: program.status as ProgramEnrollmentStatus,
    id: createId({ prefix: "prog_" }),
    workspaceId: createId({ prefix: "ws_" }),
    slug: `pw-bounties-${suffix}-${i}`,
  }));

  const [approved, archived, banned, deactivated] = programs;

  const bountyId = () => createId({ prefix: "bnty_" });
  const bounties = {
    approved: bountyId(),
    archivedBounty: bountyId(),
    // an ended bounty stays visible because the partner has a submission on it
    endedWithSubmission: bountyId(),
    archivedEnrollment: bountyId(),
    banned: bountyId(),
    deactivated: bountyId(),
  };

  test.beforeAll(async ({ api }) => {
    const { data: partner } = await createPartner(api);
    partnerId = partner.id;

    token = `dub_pw_${nanoid(24)}`;
    const user = await prisma.user.create({
      data: {
        id: createId({ prefix: "user_" }),
        email: partner.email,
        emailVerified: new Date(),
        defaultPartnerId: partner.id,
        partners: {
          create: {
            partnerId: partner.id,
            role: "owner",
          },
        },
        tokens: {
          create: {
            name: "Playwright partner profile bounties",
            hashedKey: await hashToken(token),
            partialKey: `${token.slice(0, 3)}...${token.slice(-4)}`,
          },
        },
      },
    });
    userId = user.id;

    for (const program of programs) {
      await prisma.project.create({
        data: {
          id: program.workspaceId,
          name: program.name,
          slug: program.slug,
          billingCycleStart: 1,
        },
      });
      await prisma.program.create({
        data: {
          id: program.id,
          workspaceId: program.workspaceId,
          name: program.name,
          slug: program.slug,
          defaultFolderId: createId({ prefix: "fold_" }),
          defaultGroupId: createId({ prefix: "grp_" }),
          deactivatedAt: program.deactivatedAt,
        },
      });
      await prisma.programEnrollment.create({
        data: {
          id: createId({ prefix: "pge_" }),
          partnerId: partner.id,
          programId: program.id,
          status: program.status,
        },
      });
    }

    const activeBounty = (id: string, programId: string) => ({
      id,
      programId,
      name: `PWB ${suffix} bounty`,
      type: "submission" as const,
      startsAt: new Date(Date.now() - day),
    });

    await prisma.bounty.createMany({
      data: [
        activeBounty(bounties.approved, approved.id),
        {
          ...activeBounty(bounties.archivedBounty, approved.id),
          archivedAt: new Date(),
        },
        {
          ...activeBounty(bounties.endedWithSubmission, approved.id),
          startsAt: new Date(Date.now() - 10 * day),
          endsAt: new Date(Date.now() - day),
        },
        activeBounty(bounties.archivedEnrollment, archived.id),
        activeBounty(bounties.banned, banned.id),
        activeBounty(bounties.deactivated, deactivated.id),
      ],
    });

    await prisma.bountySubmission.create({
      data: {
        id: createId({ prefix: "bnty_sub_" }),
        programId: approved.id,
        partnerId: partner.id,
        bountyId: bounties.endedWithSubmission,
      },
    });

    // two links in the approved program, so the route sums their stats
    await prisma.link.createMany({
      data: [
        { clicks: 3, saleAmount: 1000 },
        { clicks: 4, saleAmount: 2500 },
      ].map((stats) => {
        const key = `pwb-${nanoid(8).toLowerCase()}`;

        return {
          ...stats,
          id: createId({ prefix: "link_" }),
          domain: "dub.sh",
          key,
          url: "https://dub.co",
          shortLink: `https://dub.sh/${key}`,
          projectId: approved.workspaceId,
          programId: approved.id,
          partnerId: partner.id,
        };
      }),
    });
  });

  test.afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } });
    // deletePartner also deletes the partner's links
    await deletePartner(partnerId);
    // Prisma's emulated relations break these deletes, so use raw SQL like deletePartner
    for (const program of programs) {
      await prisma.$executeRaw`DELETE FROM BountySubmission WHERE programId = ${program.id}`;
      await prisma.$executeRaw`DELETE FROM Bounty WHERE programId = ${program.id}`;
      await prisma.$executeRaw`DELETE FROM Program WHERE id = ${program.id}`;
      await prisma.$executeRaw`DELETE FROM Project WHERE id = ${program.workspaceId}`;
    }
  });

  const withPartnerApi = async (
    playwright: Parameters<typeof createBearerApiClient>[0]["playwright"],
    run: (
      partnerApi: Awaited<ReturnType<typeof createBearerApiClient>>["api"],
    ) => Promise<void>,
  ) => {
    const { api: partnerApi, dispose } = await createBearerApiClient({
      playwright,
      token,
    });
    try {
      await run(partnerApi);
    } finally {
      await dispose();
    }
  };

  // only the bounties of this test, because the partner is also in the test workspace program
  const testBounties = (data: PartnerProfileBounty[]) =>
    data.filter((bounty) => Object.values(bounties).includes(bounty.id));

  test("returns the bounties of approved and archived enrollments", async ({
    playwright,
  }) => {
    await withPartnerApi(playwright, async (partnerApi) => {
      const { status, data } = await partnerApi.get<PartnerProfileBounty[]>(
        "/api/partner-profile/bounties",
      );

      expect(status).toEqual(200);
      // no archived bounty, and no bounty of a banned enrollment or a deactivated program
      expect(
        testBounties(data)
          .map(({ id }) => id)
          .sort(),
      ).toEqual(
        [
          bounties.approved,
          bounties.endedWithSubmission,
          bounties.archivedEnrollment,
        ].sort(),
      );
    });
  });

  test("returns the program of each bounty", async ({ playwright }) => {
    await withPartnerApi(playwright, async (partnerApi) => {
      const { data } = await partnerApi.get<PartnerProfileBounty[]>(
        "/api/partner-profile/bounties",
      );

      const bounty = data.find(({ id }) => id === bounties.archivedEnrollment);

      expect(bounty?.program).toEqual({
        id: archived.id,
        name: archived.name,
        slug: archived.slug,
        logo: null,
      });
    });
  });

  test("sums the partner's link stats like the program bounties route", async ({
    playwright,
  }) => {
    await withPartnerApi(playwright, async (partnerApi) => {
      const { data: allPrograms } = await partnerApi.get<
        PartnerProfileBounty[]
      >("/api/partner-profile/bounties");
      const { data: oneProgram } = await partnerApi.get<PartnerProfileBounty[]>(
        `/api/partner-profile/programs/${approved.id}/bounties`,
      );

      const stats = (data: PartnerProfileBounty[]) =>
        data.find(({ id }) => id === bounties.approved)?.partner;

      expect(stats(allPrograms)).toMatchObject({
        totalClicks: 7,
        totalSaleAmount: 3500,
      });
      expect(stats(oneProgram)).toEqual(stats(allPrograms));
      // a program without links gets zero stats
      expect(
        allPrograms.find(({ id }) => id === bounties.archivedEnrollment)
          ?.partner,
      ).toMatchObject({ totalClicks: 0, totalSaleAmount: 0 });
    });
  });
});
