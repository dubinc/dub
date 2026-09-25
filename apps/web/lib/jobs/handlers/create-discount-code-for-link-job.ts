import { DubApiError } from "@/lib/api/errors";
import { createDiscountCode } from "@/lib/discounts/create-discount-code";
import { isNonRecoverableDiscountError } from "@/lib/discounts/discount-error";
import { isDiscountCodeDeleted } from "@/lib/discounts/is-discount-code-deleted";
import { isDiscountDeleted } from "@/lib/discounts/is-discount-deleted";
import { prisma } from "@/lib/prisma";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  linkId: z
    .string()
    .describe("The ID of the link to create a discount code for."),
});

// Create a discount code for a single default partner link.
// Fan-out from sync and discount publish can queue thousands of jobs; flow
// control caps concurrent creates so we don't stampede Stripe/Shopify.
export const createDiscountCodeForLinkJob = defineJob({
  name: "create-discount-code-for-link-job",
  schema: inputSchema,
  defaults: {
    flowControl: {
      key: "create-discount-code-for-link",
      parallelism: 20,
    },
  },
  async handle({ linkId }) {
    const link = await prisma.link.findUnique({
      where: {
        id: linkId,
      },
      select: {
        id: true,
        discountCode: true,
        partnerGroupDefaultLinkId: true,
        linkReward: {
          select: {
            discount: true,
          },
        },
        programEnrollment: {
          select: {
            discount: true,
            partner: {
              select: {
                id: true,
                name: true,
              },
            },
            program: {
              select: {
                id: true,
              },
            },
          },
        },
        project: {
          select: {
            id: true,
            webhookEnabled: true,
            stripeConnectId: true,
            shopifyStoreId: true,
          },
        },
      },
    });

    if (!link || !link.project) {
      console.info(`Link ${linkId} not found. Skipping...`);
      return;
    }

    if (link.discountCode && !isDiscountCodeDeleted(link.discountCode)) {
      console.info(`Link ${linkId} already has a discount code. Skipping...`);
      return;
    }

    if (link.partnerGroupDefaultLinkId === null) {
      console.info(`Link ${linkId} is not a default link. Skipping...`);
      return;
    }

    if (!link.programEnrollment) {
      console.info(
        `Link ${linkId} is not associated with a program enrollment. Skipping...`,
      );
      return;
    }

    const {
      project: workspace,
      programEnrollment: { program, partner },
    } = link;

    const discount =
      link.linkReward?.discount ?? link.programEnrollment.discount;

    if (!discount) {
      console.info(
        `Partner ${partner.id} does not have a discount with program ${program.id}. Skipping...`,
      );
      return;
    }

    if (isDiscountDeleted(discount)) {
      console.info(`Discount ${discount.id} is soft-deleted. Skipping...`);
      return;
    }

    if (!discount.autoProvisionEnabledAt) {
      console.info(
        `Discount ${discount.id} does not have auto-provision enabled. Skipping...`,
      );
      return;
    }

    try {
      await createDiscountCode({
        workspace,
        partner,
        link,
        discount,
      });
    } catch (error) {
      if (isNonRecoverableDiscountError(error)) {
        console.warn(error.message);
        return;
      }

      if (
        error instanceof DubApiError &&
        (error.code === "conflict" || error.code === "bad_request")
      ) {
        console.warn(error.message);
        return;
      }

      throw error;
    }

    console.info(`Discount code created for link ${linkId}.`);
  },
});
