import { prisma } from "@/lib/prisma";
import { Prisma, type Discount } from "@prisma/client";

type DiscountRow = Discount & {
  partnersCount: bigint | number;
};

// Lists program discounts (optionally filtered by group) with a partnersCount.
export async function listDiscounts({
  programId,
  groupId,
}: {
  programId: string;
  groupId?: string | null;
}) {
  const discounts = await prisma.$queryRaw<DiscountRow[]>(Prisma.sql`
    SELECT
      d.id,
      d.programId,
      d.groupId,
      d.amount,
      d.type,
      d.maxDuration,
      d.description,
      d.couponId,
      d.couponTestId,
      d.autoProvisionEnabledAt,
      d.provider,
      d.createdAt,
      d.updatedAt,
      (
        SELECT COUNT(*)
        FROM ProgramEnrollment pe
        WHERE pe.discountId = d.id
      ) AS partnersCount
    FROM Discount d
    WHERE d.programId = ${programId}
      ${groupId ? Prisma.sql`AND d.groupId = ${groupId}` : Prisma.sql``}
    ORDER BY d.createdAt DESC
  `);

  return discounts.map((discount) => ({
    ...discount,
    partnersCount: Number(discount.partnersCount),
  }));
}
