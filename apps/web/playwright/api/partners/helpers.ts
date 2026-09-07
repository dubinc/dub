import { createId } from "@/lib/api/create-id";
import { conn } from "@/lib/planetscale";
import { prisma } from "@/lib/prisma";
import type { EnrolledPartnerProps } from "@/lib/types";
import { DEFAULT_ADDITIONAL_PARTNER_LINKS } from "@/lib/zod/schemas/groups";
import { nanoid } from "@dub/utils";
import { randomName, randomPartnerEmail } from "../../utils";
import type { ApiClient } from "../fixtures";
import { TEST_WORKSPACE } from "../setup-test-workspace";

export async function createPartner(
  api: ApiClient,
  overrides: Record<string, unknown> = {},
) {
  return api.post<EnrolledPartnerProps>("/api/partners", {
    name: randomName(),
    email: randomPartnerEmail(),
    ...overrides,
  });
}

export async function createGroupWithAdditionalLinks(programId: string) {
  return prisma.partnerGroup.create({
    data: {
      id: createId({ prefix: "grp_" }),
      programId,
      slug: `pw-links-${nanoid(8).toLowerCase()}`,
      name: randomName("links-group"),
      maxPartnerLinks: DEFAULT_ADDITIONAL_PARTNER_LINKS,
      additionalLinks: [
        {
          domain: "example.com",
          path: "",
          validationMode: "domain",
        },
      ],
      partnerGroupDefaultLinks: {
        create: {
          id: createId({ prefix: "pgdl_" }),
          programId,
          domain: TEST_WORKSPACE.program.domain,
          url: TEST_WORKSPACE.program.url,
        },
      },
    },
  });
}

function isRelationConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "P2014" || error.code === "P2003")
  );
}

// Commissions/payouts/customers require ProgramEnrollment. Lead tracking also
// queues create-partner-commission via QStash, so rows can appear after the
// first deleteMany — retry until enrollment delete succeeds.
export async function deletePartnerData(partnerId: string) {
  await prisma.notificationEmail.deleteMany({
    where: { partnerId },
  });

  await prisma.discountCode.deleteMany({
    where: { partnerId },
  });

  const deadline = Date.now() + 15_000;

  while (true) {
    try {
      await prisma.commission.deleteMany({
        where: { partnerId },
      });

      await prisma.payout.deleteMany({
        where: { partnerId },
      });

      await prisma.submittedLead.deleteMany({
        where: { partnerId },
      });

      await prisma.customer.deleteMany({
        where: { partnerId },
      });

      await prisma.link.deleteMany({
        where: { partnerId },
      });

      await prisma.programEnrollment.deleteMany({
        where: { partnerId },
      });
      return;
    } catch (error) {
      if (!isRelationConstraintError(error) || Date.now() >= deadline) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}

export async function deletePartner(partnerId: string | undefined) {
  if (!partnerId) return;

  await deletePartnerData(partnerId);

  // Prisma partner.delete hits a PlanetScale relation quirk; raw SQL matches
  // bulkDeletePartners cleanup used by e2e cron.
  await conn.execute(`DELETE FROM Partner WHERE id = ?`, [partnerId]);
}
