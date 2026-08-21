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

export async function deletePartner(partnerId: string | undefined) {
  if (!partnerId) return;

  await prisma.commission.deleteMany({
    where: {
      partnerId,
    },
  });

  await prisma.payout.deleteMany({
    where: {
      partnerId,
    },
  });

  await prisma.discountCode.deleteMany({
    where: {
      partnerId,
    },
  });

  await prisma.link.deleteMany({
    where: {
      partnerId,
    },
  });

  await prisma.programEnrollment.deleteMany({
    where: {
      partnerId,
    },
  });

  // Prisma partner.delete hits a PlanetScale relation quirk; raw SQL matches
  // bulkDeletePartners cleanup used by e2e cron.
  await conn.execute(`DELETE FROM Partner WHERE id = ?`, [partnerId]);
}
