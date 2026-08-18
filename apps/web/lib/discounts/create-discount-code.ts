import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { nanoid } from "@dub/utils";
import { Discount, Link, Partner, Prisma, Project } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { sendWorkspaceWebhook } from "../webhook/publish";
import { DiscountCodeWebhookSchema } from "../zod/schemas/discount";
import { constructDiscountCode } from "./construct-discount-code";
import { getDiscountProvider } from "./discount-provider";

const MAX_ATTEMPTS = 3;

interface CreateDiscountCodeArgs {
  workspace: Pick<
    Project,
    "id" | "stripeConnectId" | "shopifyStoreId" | "webhookEnabled"
  >;
  partner: Pick<Partner, "id" | "name">;
  link: Pick<Link, "id">;
  discount: Discount;
  code?: string;
}

export async function createDiscountCode({
  workspace,
  partner,
  link,
  discount,
  code,
}: CreateDiscountCodeArgs) {
  const finalCode =
    code ||
    constructDiscountCode({
      partner,
      discount,
    });

  const linkWithCode = await prisma.link.findUnique({
    where: {
      id: link.id,
    },
    select: {
      discountCode: {
        select: {
          code: true,
        },
      },
    },
  });

  if (linkWithCode?.discountCode) {
    throw new DubApiError({
      code: "bad_request",
      message: `This link already has a discount code (${linkWithCode.discountCode.code}) assigned.`,
    });
  }

  const discountProvider = getDiscountProvider(discount.provider);
  const shouldRetry = !code;

  const externalDiscountCode = await discountProvider.createDiscountCode({
    workspace,
    discount,
    code: finalCode,
    shouldRetry,
  });

  let currentCode = externalDiscountCode.code;
  let discountCode: DiscountCodeWithDiscount | undefined;

  for (let attempt = 0; attempt < (shouldRetry ? MAX_ATTEMPTS : 1); attempt++) {
    const result = await createDiscountCodeRecord({
      workspace,
      partner,
      link,
      discount,
      code: currentCode,
      canRetry: shouldRetry && attempt < MAX_ATTEMPTS - 1,
      discountProvider,
    });

    if (result.discountCode) {
      discountCode = result.discountCode;
      break;
    }

    currentCode = result.nextCode;
  }

  if (!discountCode) {
    throw new DubApiError({
      code: "conflict",
      message:
        "This discount code is already in use, or this link already has a code. Please refresh and try again.",
    });
  }

  waitUntil(
    sendWorkspaceWebhook({
      workspace,
      trigger: "discount_code.created",
      data: DiscountCodeWebhookSchema.parse(discountCode),
    }),
  );

  return discountCode;
}

type DiscountCodeWithDiscount = Prisma.DiscountCodeGetPayload<{
  include: { discount: true };
}>;

type CreateDiscountCodeRecordResult =
  | { discountCode: DiscountCodeWithDiscount; nextCode?: never }
  | { nextCode: string; discountCode?: never };

async function createDiscountCodeRecord({
  workspace,
  partner,
  link,
  discount,
  code,
  canRetry,
  discountProvider,
}: {
  workspace: CreateDiscountCodeArgs["workspace"];
  partner: CreateDiscountCodeArgs["partner"];
  link: CreateDiscountCodeArgs["link"];
  discount: Discount;
  code: string;
  canRetry: boolean;
  discountProvider: ReturnType<typeof getDiscountProvider>;
}): Promise<CreateDiscountCodeRecordResult> {
  try {
    const discountCode = await prisma.discountCode.create({
      data: {
        id: createId({ prefix: "dcode_" }),
        code,
        programId: discount.programId,
        partnerId: partner.id,
        linkId: link.id,
        discountId: discount.id,
      },
      include: {
        discount: true,
      },
    });

    return {
      discountCode,
    };
  } catch (error) {
    const isUniqueConflict =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002";

    if (isUniqueConflict && canRetry) {
      await rollbackExternalDiscountCode({
        discountProvider,
        workspace,
        code,
      });

      const existingForLink = await prisma.discountCode.findUnique({
        where: {
          linkId: link.id,
        },
        select: {
          code: true,
        },
      });

      if (existingForLink) {
        throw new DubApiError({
          code: "bad_request",
          message: `This link already has a discount code (${existingForLink.code}) assigned.`,
        });
      }

      const nextCode = `${code}${nanoid(2)}`;
      console.warn(
        `Discount code "${code}" already exists. Retrying with "${nextCode}".`,
      );

      const retried = await discountProvider.createDiscountCode({
        workspace,
        discount,
        code: nextCode,
        shouldRetry: false,
      });

      return {
        nextCode: retried.code,
      };
    }

    await rollbackExternalDiscountCode({
      discountProvider,
      workspace,
      code,
    });

    if (isUniqueConflict) {
      throw new DubApiError({
        code: "conflict",
        message:
          "This discount code is already in use, or this link already has a code. Please refresh and try again.",
      });
    }

    throw error;
  }
}

async function rollbackExternalDiscountCode({
  discountProvider,
  workspace,
  code,
}: {
  discountProvider: ReturnType<typeof getDiscountProvider>;
  workspace: CreateDiscountCodeArgs["workspace"];
  code: string;
}) {
  try {
    await discountProvider.disableDiscountCode({
      workspace,
      code,
    });
  } catch (rollbackError) {
    console.error("Failed to rollback external discount code", {
      code,
      rollbackError,
    });
  }
}
