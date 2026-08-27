import { conn } from "@/lib/planetscale";
import { prisma } from "@/lib/prisma";
import type { EnrolledPartnerProps } from "@/lib/types";
import { randomName, randomPartnerEmail } from "../../utils";
import type { ApiClient } from "../fixtures";

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
