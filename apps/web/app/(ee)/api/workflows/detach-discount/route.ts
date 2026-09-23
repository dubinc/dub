import { logger } from "@/lib/axiom/server";
import {
  detachDiscountFromLinkRewards,
  detachDiscountFromProgramEnrollments,
  dispatchRemapDiscountCodes,
} from "@/lib/discounts/detach-discount";
import { prisma } from "@/lib/prisma";
import { serve } from "@upstash/workflow/nextjs";
import * as z from "zod/v4";
import { logAndReturn } from "../../cron/utils";

const inputSchema = z.object({
  programId: z.string(),
  discountId: z.string(),
});

type Input = z.infer<typeof inputSchema>;

/**
 * Detach Discount Workflow
 *
 * Soft-deleted discounts (programId cleared) are cleaned up as:
 *
 * 1. detach-discount-from-enrollments + detach-discount-from-link-rewards (parallel)
 * 2. remap-discount-codes
 * 3. delete-discount
 */

// POST /api/workflows/detach-discount
export const { POST } = serve<Input>(
  async (context) => {
    const input = inputSchema.parse(context.requestPayload);
    const { programId, discountId } = input;

    const shouldProceed = await context.run("validate-discount", async () => {
      const discount = await prisma.discount.findUnique({
        where: {
          id: discountId,
        },
        select: {
          id: true,
          programId: true,
        },
      });

      if (!discount) {
        return logAndReturn({
          proceed: false,
          outputLog: `Discount ${discountId} not found. Skipping...`,
        });
      }

      if (discount.programId !== null) {
        return logAndReturn({
          proceed: false,
          outputLog: `Discount ${discountId} is still associated with a program. Skipping...`,
        });
      }

      return logAndReturn({
        proceed: true,
        outputLog: `Proceeding with detach discount for ${discountId}`,
      });
    });

    if (!shouldProceed.proceed) {
      return;
    }

    // Run these in parallel
    await Promise.all([
      context.run("detach-discount-from-enrollments", async () => {
        await detachDiscountFromProgramEnrollments({
          programId,
          discountId,
        });

        return logAndReturn({
          outputLog: `Detached discount ${discountId} from program enrollments`,
        });
      }),

      context.run("detach-discount-from-link-rewards", async () => {
        await detachDiscountFromLinkRewards({
          programId,
          discountId,
        });

        return logAndReturn({
          outputLog: `Detached discount ${discountId} from link rewards`,
        });
      }),
    ]);

    // This should run after the enrollments and link rewards are updated
    await context.run("remap-discount-codes", async () => {
      await dispatchRemapDiscountCodes({
        programId,
        discountId,
      });

      return logAndReturn({
        outputLog: `Remapped discount codes for discount ${discountId}`,
      });
    });

    // This should run after the discount codes are remapped
    await context.run("delete-discount", async () => {
      await prisma.discount.deleteMany({
        where: {
          id: discountId,
        },
      });

      return logAndReturn({
        outputLog: `Deleted discount ${discountId}`,
      });
    });
  },
  {
    failureFunction: async ({
      context,
      failStatus,
      failResponse,
      failHeaders,
    }) => {
      logger.error("workflow.failed", {
        service: "qstash",
        event: "workflow.failed",
        workflowType: "detach-discount",
        workflowRunId: context.workflowRunId,
        discountId: context.requestPayload?.discountId,
        programId: context.requestPayload?.programId,
        failStatus,
        failResponse,
        failHeaders,
      });

      await logger.flush();
    },
  },
);
