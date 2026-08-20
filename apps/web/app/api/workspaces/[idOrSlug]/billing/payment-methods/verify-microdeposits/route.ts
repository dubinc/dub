import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  findPendingMicrodeposit,
  verifyIntentMicrodeposits,
} from "@/lib/stripe/microdeposits";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import * as z from "zod/v4";

const verifyMicrodepositsSchema = z
  .object({
    paymentMethodId: z.string().min(1),
    amounts: z
      .tuple([z.number().int().min(1).max(99), z.number().int().min(1).max(99)])
      .optional(),
    descriptorCode: z
      .string()
      .regex(/^SM[0-9A-Z]{4}$/i, {
        message: "Descriptor code must be 6 characters starting with SM.",
      })
      .optional(),
  })
  .refine((data) => Boolean(data.amounts) !== Boolean(data.descriptorCode), {
    message: "Provide either deposit amounts or a descriptor code.",
  });

// POST /api/workspaces/[idOrSlug]/billing/payment-methods/verify-microdeposits
export const POST = withWorkspace(
  async ({ workspace, req }) => {
    if (!workspace.stripeId) {
      throw new DubApiError({
        code: "bad_request",
        message: "Workspace does not have a Stripe ID.",
      });
    }

    const { paymentMethodId, amounts, descriptorCode } =
      verifyMicrodepositsSchema.parse(await parseRequestBody(req));

    const pending = await findPendingMicrodeposit({
      stripeId: workspace.stripeId,
      paymentMethodId,
    });

    if (!pending) {
      throw new DubApiError({
        code: "not_found",
        message:
          "No pending microdeposit verification found for this payment method.",
      });
    }

    if (pending.type === "descriptor_code" && !descriptorCode) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "This bank account requires a 6-character descriptor code starting with SM.",
      });
    }

    if (pending.type === "amounts" && !amounts) {
      throw new DubApiError({
        code: "bad_request",
        message: "This bank account requires the two microdeposit amounts.",
      });
    }

    try {
      const intent = await verifyIntentMicrodeposits({
        pending,
        amounts,
        descriptorCode,
      });

      return NextResponse.json({
        id: paymentMethodId,
        status: intent.status,
      });
    } catch (error) {
      if (error instanceof DubApiError || error instanceof z.ZodError) {
        throw error;
      }

      throw new DubApiError({
        code: "bad_request",
        message:
          error instanceof Stripe.errors.StripeError
            ? error.message
            : "Failed to verify microdeposits. Please check the values and try again.",
      });
    }
  },
  {
    requiredPermissions: ["billing.write"],
  },
);
