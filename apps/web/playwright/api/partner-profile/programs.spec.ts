import { createId } from "@/lib/api/create-id";
import { hashToken } from "@/lib/auth/hash-token";
import { prisma } from "@/lib/prisma";
import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import { ProgramEnrollmentStatus } from "@prisma/client";
import { createBearerApiClient, test } from "../fixtures";
import { createPartner, deletePartner } from "../partners/helpers";

type PartnerProfileProgram = {
  status: ProgramEnrollmentStatus;
  totalCommissions: number;
  program: { id: string; name: string };
};

type StatusCount = { status: ProgramEnrollmentStatus; _count: number };

test.describe("GET /partner-profile/programs", () => {
  let partnerId: string | undefined;
  let userId: string | undefined;
  let token: string;

  // each program is in its own workspace, and the names share a suffix for search
  const suffix = nanoid(8).toLowerCase();
  const programs = [
    { name: `PWP ${suffix} Alpha`, status: "pending", totalCommissions: 0 },
    { name: `PWP ${suffix} Beta`, status: "rejected", totalCommissions: 0 },
    { name: `PWP ${suffix} Gamma`, status: "approved", totalCommissions: 5000 },
    { name: `PWP ${suffix} Delta`, status: "approved", totalCommissions: 2000 },
    // a deactivated program, which the list and the counts exclude
    {
      name: `PWP ${suffix} Deactivated`,
      status: "invited",
      totalCommissions: 0,
      deactivatedAt: new Date(),
    },
  ].map((program, i) => ({
    ...program,
    status: program.status as ProgramEnrollmentStatus,
    id: createId({ prefix: "prog_" }),
    workspaceId: createId({ prefix: "ws_" }),
    slug: `pw-programs-${suffix}-${i}`,
  }));

  const [alpha, beta, gamma, delta, deactivated] = programs;

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
            name: "Playwright partner profile programs",
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
          totalCommissions: program.totalCommissions,
        },
      });
    }
  });

  test.afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await deletePartner(partnerId);
    // Prisma's emulated relations break program and project deletes, so use raw SQL like deletePartner
    for (const program of programs) {
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

  const programIds = (data: PartnerProfileProgram[]) =>
    data.map((enrollment) => enrollment.program.id);

  test("returns every enrollment by default, without deactivated programs", async ({
    playwright,
    program,
  }) => {
    await withPartnerApi(playwright, async (partnerApi) => {
      const { status, data } = await partnerApi.get<PartnerProfileProgram[]>(
        "/api/partner-profile/programs",
      );

      expect(status).toEqual(200);
      expect(programIds(data).sort()).toEqual(
        [program.id, alpha.id, beta.id, gamma.id, delta.id].sort(),
      );
      // the default sort is by earnings, highest first
      expect(programIds(data).slice(0, 2)).toEqual([gamma.id, delta.id]);
    });
  });

  test("filters by a list of statuses", async ({ playwright }) => {
    await withPartnerApi(playwright, async (partnerApi) => {
      const { status, data } = await partnerApi.get<PartnerProfileProgram[]>(
        "/api/partner-profile/programs?status=pending,rejected",
      );

      expect(status).toEqual(200);
      expect(programIds(data).sort()).toEqual([alpha.id, beta.id].sort());
    });
  });

  test("searches by program name", async ({ playwright }) => {
    await withPartnerApi(playwright, async (partnerApi) => {
      const { data } = await partnerApi.get<PartnerProfileProgram[]>(
        `/api/partner-profile/programs?search=${encodeURIComponent(`${suffix} gam`)}`,
      );

      expect(programIds(data)).toEqual([gamma.id]);
    });
  });

  test("sorts by program name and paginates", async ({ playwright }) => {
    await withPartnerApi(playwright, async (partnerApi) => {
      const query = `search=${suffix}&sortBy=name&sortOrder=asc&pageSize=3`;

      const { data: page1 } = await partnerApi.get<PartnerProfileProgram[]>(
        `/api/partner-profile/programs?${query}&page=1`,
      );
      const { data: page2 } = await partnerApi.get<PartnerProfileProgram[]>(
        `/api/partner-profile/programs?${query}&page=2`,
      );

      expect(programIds(page1)).toEqual([alpha.id, beta.id, delta.id]);
      expect(programIds(page2)).toEqual([gamma.id]);
    });
  });

  test("reads includeRewardsDiscounts=false as false", async ({
    playwright,
  }) => {
    await withPartnerApi(playwright, async (partnerApi) => {
      const path = `/api/partner-profile/programs?search=${suffix}`;

      const { data: withRewards } = await partnerApi.get<
        Record<string, unknown>[]
      >(`${path}&includeRewardsDiscounts=true`);
      const { data: withoutRewards } = await partnerApi.get<
        Record<string, unknown>[]
      >(`${path}&includeRewardsDiscounts=false`);
      const { status } = await partnerApi.get(
        `${path}&includeRewardsDiscounts=yes`,
      );

      // the discount is in the response only when the API includes it
      expect(withRewards.length).toBeGreaterThan(0);
      expect(withoutRewards.length).toBeGreaterThan(0);
      expect(withRewards.every((e) => "discount" in e)).toBe(true);
      expect(withoutRewards.some((e) => "discount" in e)).toBe(false);
      expect(status).toEqual(422);
    });
  });

  test("rejects an unknown status", async ({ playwright }) => {
    await withPartnerApi(playwright, async (partnerApi) => {
      const { status } = await partnerApi.get(
        "/api/partner-profile/programs?status=approved,unknown",
      );

      expect(status).toEqual(422);
    });
  });

  test("counts with the same filters as the list", async ({ playwright }) => {
    await withPartnerApi(playwright, async (partnerApi) => {
      const { data: applications } = await partnerApi.get<number>(
        `/api/partner-profile/programs/count?status=pending,rejected`,
      );
      const { data: search } = await partnerApi.get<number>(
        `/api/partner-profile/programs/count?search=${suffix}`,
      );
      // the invitation is in a deactivated program, so it is not counted
      const { data: invitations } = await partnerApi.get<number>(
        `/api/partner-profile/programs/count?status=invited`,
      );

      expect(applications).toEqual(2);
      expect(search).toEqual(4);
      expect(invitations).toEqual(0);
    });
  });

  test("counts per status, with every status", async ({ playwright }) => {
    await withPartnerApi(playwright, async (partnerApi) => {
      const { status, data } = await partnerApi.get<StatusCount[]>(
        `/api/partner-profile/programs/count?groupBy=status&search=${suffix}`,
      );

      expect(status).toEqual(200);
      expect(Object.fromEntries(data.map((c) => [c.status, c._count]))).toEqual(
        {
          ...Object.fromEntries(
            Object.values(ProgramEnrollmentStatus).map((s) => [s, 0]),
          ),
          approved: 2,
          pending: 1,
          rejected: 1,
        },
      );
    });
  });
});
