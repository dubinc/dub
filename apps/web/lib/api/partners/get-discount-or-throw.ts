import { DiscountSchema } from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { Discount } from "@prisma/client";
import { DubApiError } from "../errors";

export async function getDiscountOrThrow({
  discountId,
  programId,
  includePartnersCount = false,
}: {
  discountId: string;
  programId: string;
  includePartnersCount?: boolean;
}) {
  const discount = (await prisma.discount.findUnique({
    where: {
      id: discountId,
    },
    ...(includePartnersCount && {
      include: {
        _count: {
          select: { programEnrollments: true },
        },
      },
    }),
  })) as Discount & { _count?: { programEnrollments: number } };

  if (!discount) {
    throw new DubApiError({
      code: "not_found",
      message: "Discount not found.",
    });
  }

  if (discount.programId !== programId) {
    throw new DubApiError({
      code: "not_found",
      message: "Discount does not belong to this program.",
    });
  }

  return DiscountSchema.parse({
    ...discount,
    ...(includePartnersCount && {
      partnersCount: discount._count?.programEnrollments,
    }),
  });
}
