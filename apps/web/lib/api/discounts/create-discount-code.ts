import { createId } from "@/lib/api/create-id";
import { createStripeDiscountCode } from "@/lib/stripe/create-stripe-discount-code";
import { prisma } from "@dub/prisma";
import { Discount, Link, Partner, Prisma } from "@dub/prisma/client";
import { nanoid } from "@dub/utils";
import { constructDiscountCode } from "./construct-discount-code";

const MAX_ATTEMPTS = 3;

export async function createDiscountCode({
  stripeConnectId,
  partner,
  link,
  discount,
  code,
}: {
  stripeConnectId: string;
  partner: Pick<Partner, "id" | "name">;
  link: Pick<Link, "id">;
  discount: Pick<Discount, "id" | "programId" | "couponId" | "amount" | "type">;
  code?: string;
}) {
  let finalCode = code;

  // Construct the discount code if no code is provided
  if (!finalCode) {
    finalCode = constructDiscountCode({
      partner,
      discount,
    });
  }

  finalCode = sanitizeCodeForStripe(finalCode);

  let attempt = 0;

  while (attempt < MAX_ATTEMPTS) {
    const stripeDiscountCode = await createStripeDiscountCode({
      stripeConnectId,
      discount,
      code: finalCode,
      shouldRetry: true,
    });

    try {
      const discountCode = await prisma.discountCode.create({
        data: {
          id: createId({ prefix: "dcode_" }),
          code: stripeDiscountCode.code,
          programId: discount.programId,
          partnerId: partner.id,
          linkId: link.id,
          discountId: discount.id,
        },
      });

      return discountCode;
    } catch (error) {
      // Handle unique constraint collision
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const hasAttemptsLeft = attempt < MAX_ATTEMPTS - 1;

        // Generate a new suffix for retry
        if (hasAttemptsLeft) {
          finalCode = `${stripeDiscountCode.code}${nanoid(3)}`.toUpperCase();
          attempt++;
          continue;
        }

        // Exhausted retries
        throw new Error(
          `Failed to generate a unique discount code after ${MAX_ATTEMPTS} attempts.`,
        );
      }

      // Re-throw unknown DB error
      throw error;
    }
  }
}

function sanitizeCodeForStripe(code: string): string {
  const sanitized = code.replace(/[^a-zA-Z0-9\-_]/g, "");

  if (!sanitized) {
    throw new Error(
      `Discount code "${code}" has no valid characters for Stripe (allowed: letters, numbers, hyphen, underscore).`,
    );
  }

  return sanitized;
}
