import { DubApiError } from "@/lib/api/errors";
import { getDiscountCodeOrThrow } from "@/lib/discount-codes/get-discount-code-or-throw";
import { prisma } from "@/lib/prisma";
import { DiscountProvider, Prisma, Project } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { sendDiscountCodeWebhook } from "./discount-code-webhook";

interface UpdateDiscountCodeArgs {
  workspace: Pick<Project, "id" | "webhookEnabled">;
  discountCode: Awaited<ReturnType<typeof getDiscountCodeOrThrow>>;
  newCode: string;
}

export async function updateDiscountCode({
  workspace,
  discountCode,
  newCode,
}: UpdateDiscountCodeArgs) {
  if (discountCode.discount.provider !== DiscountProvider.custom) {
    throw new DubApiError({
      code: "bad_request",
      message: `This operation is only available for "custom" discount provider.`,
    });
  }

  if (newCode !== discountCode.code) {
    await assertDiscountCodeAvailable({
      programId: discountCode.programId,
      code: newCode,
    });
  }

  let updatedDiscountCode: Prisma.DiscountCodeGetPayload<{
    include: { discount: true };
  }>;

  try {
    updatedDiscountCode = await prisma.discountCode.update({
      where: {
        id: discountCode.id,
      },
      data: {
        code: newCode,
      },
      include: {
        discount: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      await assertDiscountCodeAvailable({
        programId: discountCode.programId,
        code: newCode,
      });

      throw new DubApiError({
        code: "conflict",
        message: `This discount code "${newCode}" is already in use. Please choose a different code.`,
      });
    }

    throw error;
  }

  waitUntil(
    sendDiscountCodeWebhook({
      trigger: "discount_code.updated",
      data: updatedDiscountCode,
      workspace,
    }),
  );

  return updatedDiscountCode;
}

async function assertDiscountCodeAvailable({
  programId,
  code,
}: {
  programId: string;
  code: string;
}) {
  const duplicateByCode = await prisma.discountCode.findUnique({
    where: {
      programId_code: {
        programId,
        code,
      },
    },
    select: {
      partner: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!duplicateByCode) {
    return;
  }

  throw new DubApiError({
    code: "conflict",
    message: `This discount code "${code}" is already in use by partner "${duplicateByCode.partner.email}". Please choose a different code.`,
  });
}
