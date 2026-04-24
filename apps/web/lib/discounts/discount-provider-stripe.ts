import { prisma } from "@dub/prisma";
import { PartnerGroup, Project } from "@dub/prisma/client";
import { STRIPE_INTEGRATION_ID, truncate } from "@dub/utils";
import { z } from "zod/v4";
import { stripeIntegrationSettingsSchema } from "../integrations/stripe/schema";
import { stripeAppClient } from "../stripe";
import {
  dubDiscountToStripeCoupon,
  stripeCouponToDubDiscount,
  validateStripeCouponForDubDiscount,
} from "../stripe/coupon-discount-converter";
import { createDiscountSchema } from "../zod/schemas/discount";

function createStripeDiscountProvider() {
  const getInstallation = async (workspace: Project) => {
    if (!workspace.stripeConnectId) {
      throw new Error(
        "STRIPE_CONNECTION_REQUIRED: Your workspace isn't connected to Stripe yet. Please install the Dub Stripe app in settings to create discount.",
      );
    }

    const installation = await prisma.installedIntegration.findFirst({
      where: {
        projectId: workspace.id,
        integrationId: STRIPE_INTEGRATION_ID,
      },
    });

    if (!installation) {
      throw new Error(
        "STRIPE_CONNECTION_REQUIRED: Your workspace isn't connected to Stripe yet. Please install the Dub Stripe app in settings to create discount.",
      );
    }

    const settings = stripeIntegrationSettingsSchema.parse(
      installation.settings || {},
    );

    return {
      ...installation,
      settings,
    };
  };

  const getOrCreateCoupon = async ({
    workspace,
    group,
    data,
  }: {
    workspace: Project;
    group: PartnerGroup;
    data: z.infer<typeof createDiscountSchema>;
  }) => {
    try {
      if (data.couponId) {
        return await getCoupon({
          couponId: data.couponId,
          workspace,
        });
      } else {
        return await createCoupon({
          workspace,
          group,
          data,
        });
      }
    } catch (error) {
      throw new Error(
        error.code === "more_permissions_required_for_application"
          ? "STRIPE_APP_UPGRADE_REQUIRED: Your connected Stripe account doesn't have the permissions needed to create discount codes. Please upgrade your Stripe integration in settings or reach out to our support team for help."
          : error.code === "resource_missing"
            ? `The coupon ID you provided (${data.couponId}) was not found in your Stripe account. Please check the coupon ID and try again.`
            : error.message,
      );
    }
  };

  const getCoupon = async ({
    couponId,
    workspace,
  }: {
    couponId: string;
    workspace: Project;
  }) => {
    const { settings } = await getInstallation(workspace);

    const stripeApp = stripeAppClient({
      mode: settings.stripeMode,
    });

    const coupon = await stripeApp.coupons.retrieve(couponId, {
      stripeAccount: workspace.stripeConnectId!,
    });

    // Validate the Stripe coupon can be converted to a Dub discount
    const validation = validateStripeCouponForDubDiscount(coupon);
    if (!validation.isValid) {
      throw new Error(`Invalid Stripe coupon: ${validation.errors.join(", ")}`);
    }

    return stripeCouponToDubDiscount(coupon);
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
    const { settings } = await getInstallation(workspace);

    const stripeApp = stripeAppClient({
      mode: settings.stripeMode,
    });

    const stripeCouponData = dubDiscountToStripeCoupon({
      name: `Dub Discount (${truncate(group.name, 25)})`,
      amount: data.amount,
      type: data.type,
      maxDuration: data.maxDuration ?? null,
    });

    const coupon = await stripeApp.coupons.create(stripeCouponData, {
      stripeAccount: workspace.stripeConnectId!,
    });

    return stripeCouponToDubDiscount(coupon);
  };

  return {
    getInstallation,
    getOrCreateCoupon,
    getCoupon,
    createCoupon,
  };
}

export const stripeDiscountProvider = createStripeDiscountProvider();
