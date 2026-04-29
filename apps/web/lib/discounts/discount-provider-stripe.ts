import { prisma } from "@dub/prisma";
import { PartnerGroup, Project } from "@dub/prisma/client";
import { nanoid, STRIPE_INTEGRATION_ID, truncate } from "@dub/utils";
import * as z from "zod/v4";
import { DubApiError } from "../api/errors";
import { stripeIntegrationSettingsSchema } from "../integrations/stripe/schema";
import { stripeAppClient } from "../stripe";
import {
  dubDiscountToStripeCoupon,
  stripeCouponToDubDiscount,
  validateStripeCouponForDubDiscount,
} from "../stripe/coupon-discount-converter";
import { DiscountProps } from "../types";
import { createDiscountSchema } from "../zod/schemas/discount";
import { DiscountIntegrationNotAvailableError } from "./discount-error";

const MAX_ATTEMPTS = 3;

async function requireInstalledIntegration(
  workspace: Pick<Project, "id" | "stripeConnectId">,
) {
  if (!workspace.stripeConnectId) {
    throw new DiscountIntegrationNotAvailableError({
      message:
        "STRIPE_CONNECTION_REQUIRED: Your workspace isn't connected to Stripe yet. Please install the Dub Stripe app in settings to create a discount.",
    });
  }

  const installation = await prisma.installedIntegration.findFirst({
    where: {
      projectId: workspace.id,
      integrationId: STRIPE_INTEGRATION_ID,
    },
  });

  if (!installation) {
    throw new DiscountIntegrationNotAvailableError({
      message:
        "STRIPE_CONNECTION_REQUIRED: Your workspace isn't connected to Stripe yet. Please install the Dub Stripe app in settings to create a discount.",
    });
  }

  const settings = stripeIntegrationSettingsSchema.parse(
    installation.settings || {},
  );

  return {
    ...installation,
    settings,
  };
}

function createStripeDiscountProvider() {
  const getCoupon = async ({
    couponId,
    workspace,
  }: {
    couponId: string;
    workspace: Project;
  }) => {
    const { settings } = await requireInstalledIntegration(workspace);

    const stripeApp = stripeAppClient({
      mode: settings.stripeMode,
    });

    try {
      const coupon = await stripeApp.coupons.retrieve(couponId, {
        stripeAccount: workspace.stripeConnectId!,
      });

      // Validate the Stripe coupon can be converted to a Dub discount
      const validation = validateStripeCouponForDubDiscount(coupon);
      if (!validation.isValid) {
        throw new Error(
          `Invalid Stripe coupon: ${validation.errors.join(", ")}`,
        );
      }

      return stripeCouponToDubDiscount(coupon);
    } catch (error) {
      throw new DubApiError({
        code: "bad_request",
        message:
          error.code === "more_permissions_required_for_application"
            ? "STRIPE_APP_UPGRADE_REQUIRED: Your connected Stripe account doesn't have the permissions needed to create discount codes. Please upgrade your Stripe integration in settings or reach out to our support team for help."
            : error.code === "resource_missing"
              ? `The coupon ID you provided (${couponId}) was not found in your Stripe account. Please check the coupon ID and try again.`
              : error.message,
      });
    }
  };

  const createCoupon = async ({
    workspace,
    group,
    data,
  }: {
    workspace: Project;
    group: PartnerGroup;
    data: z.infer<typeof createDiscountSchema>;
  }) => {
    const { settings } = await requireInstalledIntegration(workspace);

    const stripeApp = stripeAppClient({
      mode: settings.stripeMode,
    });

    const stripeCouponData = dubDiscountToStripeCoupon({
      name: `Dub Discount (${truncate(group.name, 25)})`,
      amount: data.amount,
      type: data.type,
      maxDuration: data.maxDuration ?? null,
    });

    try {
      const coupon = await stripeApp.coupons.create(stripeCouponData, {
        stripeAccount: workspace.stripeConnectId!,
      });

      return stripeCouponToDubDiscount(coupon);
    } catch (error) {
      throw new DubApiError({
        code: "bad_request",
        message:
          error.code === "more_permissions_required_for_application"
            ? "STRIPE_APP_UPGRADE_REQUIRED: Your connected Stripe account doesn't have the permissions needed to create discount codes. Please upgrade your Stripe integration in settings or reach out to our support team for help."
            : error.message,
      });
    }
  };

  const createDiscountCode = async ({
    workspace,
    discount,
    code,
    shouldRetry = true,
  }: {
    workspace: Pick<Project, "id" | "stripeConnectId">;
    discount: Pick<DiscountProps, "id" | "couponId" | "amount" | "type">;
    code: string;
    shouldRetry?: boolean; // we don't retry if the code is provided by the user
  }) => {
    const { settings } = await requireInstalledIntegration(workspace);

    const stripeApp = stripeAppClient({
      mode: settings.stripeMode,
    });

    if (!discount.couponId) {
      throw new Error(`couponId not found for discount ${discount.id}.`);
    }

    let attempt = 0;
    let currentCode = code;

    while (attempt < MAX_ATTEMPTS) {
      try {
        return await stripeApp.promotionCodes.create(
          {
            coupon: discount.couponId,
            code: currentCode.toUpperCase(),
            restrictions: {
              first_time_transaction: true,
            },
          },
          {
            stripeAccount: workspace.stripeConnectId!,
          },
        );
      } catch (error: any) {
        const errorMessage = error.raw?.message || error.message;
        const isDuplicateError = errorMessage?.includes("already exists");

        if (!isDuplicateError) {
          throw error;
        }

        if (!shouldRetry) {
          throw error;
        }

        attempt++;

        if (attempt >= MAX_ATTEMPTS) {
          throw error;
        }

        const newCode = `${currentCode}${nanoid(2)}`;

        console.warn(
          `Discount code "${currentCode}" already exists. Retrying with "${newCode}" (attempt ${attempt}/${MAX_ATTEMPTS}).`,
        );

        currentCode = newCode;
      }
    }

    throw new Error("Failed to create Stripe discount code.");
  };

  const disableDiscountCode = async ({
    workspace,
    code,
  }: {
    workspace: Pick<Project, "id" | "stripeConnectId">;
    code: string;
  }) => {
    const { settings } = await requireInstalledIntegration(workspace);

    const stripeApp = stripeAppClient({
      mode: settings.stripeMode,
    });

    const promotionCodes = await stripeApp.promotionCodes.list(
      {
        code,
        limit: 1,
      },
      {
        stripeAccount: workspace.stripeConnectId!,
      },
    );

    if (promotionCodes.data.length === 0) {
      console.error(
        `Stripe promotion code ${code} not found (stripeConnectId=${workspace.stripeConnectId}).`,
      );
      return;
    }

    const promotionCode = promotionCodes.data[0];

    await stripeApp.promotionCodes.update(
      promotionCode.id,
      {
        active: false,
      },
      {
        stripeAccount: workspace.stripeConnectId!,
      },
    );

    console.info(
      `Disabled Stripe promotion code ${promotionCode.code} (id=${promotionCode.id}, stripeConnectId=${workspace.stripeConnectId}).`,
    );

    return promotionCode;
  };

  const assertDiscountIntegrationAvailable = async ({
    workspace,
  }: {
    workspace: Pick<Project, "id" | "stripeConnectId" | "shopifyStoreId">;
  }) => {
    await requireInstalledIntegration(workspace);
  };

  return {
    getCoupon,
    createCoupon,
    createDiscountCode,
    disableDiscountCode,
    assertDiscountIntegrationAvailable,
  };
}

export const stripeDiscountProvider = createStripeDiscountProvider();
