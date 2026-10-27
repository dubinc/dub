import { prisma } from "@/lib/prisma";
import { DiscountSchema } from "@/lib/zod/schemas/discount";
import { Prisma, type Discount } from "@prisma/client";
import * as z from "zod/v4";

type DiscountRow = Discount & {
  partnersCount: bigint | number;
};

export const getDiscountsQuerySchema = z.object({
  groupId: z.string().nullish(),
});

export const listDiscountsResponseSchema = z.array(
  DiscountSchema.extend({
    groupId: z.string().nullable(),
    partnersCount: z.number(),
  }),
);

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
