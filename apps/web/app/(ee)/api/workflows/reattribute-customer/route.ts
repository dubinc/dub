import {
  createClawbackAndReplacementCommissions,
  decrementOldLinkStats,
  deleteOldCustomerTinybirdEvents,
  incrementNewLinkStats,
  loadReattributeEventPlan,
  reingestCustomerEvents,
  transferUnpaidCommissions,
} from "@/lib/api/customers/reattribute-customer";
import { logger } from "@/lib/axiom/server";
import { prisma } from "@/lib/prisma";
import { reattributeCustomerWorkflowSchema } from "@/lib/zod/schemas/customers";
import { WorkflowRetryAfterError } from "@upstash/workflow";
import { serve } from "@upstash/workflow/nextjs";
import * as z from "zod/v4";
import { logAndReturn } from "../../cron/utils";

type Input = z.infer<typeof reattributeCustomerWorkflowSchema>;

/**
 * Reattribute Customer Workflow
 *
 * Moves a customer (and their events/commissions) from one partner link to another.
 *
 * 1. load-plan: inspect old/new Tinybird events
 * 2. reingest-events: copy events onto the new customer + link
 * 3. increment-new-link-stats
 * 4. transfer-unpaid-commissions
 * 5. optional-clawback
 * 6. delete-old-events
 * 7. decrement-old-link-stats
 */

// POST /api/workflows/reattribute-customer
export const { POST } = serve<Input>(
  async (context) => {
    const input = context.requestPayload;

    const plan = await context.run("load-plan", async () => {
      return await loadReattributeEventPlan({
        oldCustomerId: input.oldCustomerId,
        newCustomerId: input.newCustomerId,
      });
    });

    await context.run("reingest-events", async () => {
      try {
        const link = await prisma.link.findUniqueOrThrow({
          where: { id: input.newLinkId },
          select: {
            id: true,
            domain: true,
            key: true,
            url: true,
          },
        });

        return logAndReturn(
          await reingestCustomerEvents({
            oldCustomerId: input.oldCustomerId,
            newCustomerId: input.newCustomerId,
            newClickId: input.newClickId,
            link,
            workspaceId: input.workspaceId,
          }),
        );
      } catch (error) {
        throw new WorkflowRetryAfterError(
          error instanceof Error ? error.message : "Failed to re-ingest events",
          "5s",
        );
      }
    });

    await context.run("increment-new-link-stats", async () => {
      return logAndReturn(
        await incrementNewLinkStats({
          oldCustomerId: input.oldCustomerId,
          newLinkId: input.newLinkId,
          programId: input.programId,
          partnerId: input.newPartnerId,
          plan,
          incrementConversions: input.incrementConversions,
        }),
      );
    });

    await context.run("transfer-unpaid-commissions", async () => {
      return logAndReturn(
        await transferUnpaidCommissions({
          oldCustomerId: input.oldCustomerId,
          newCustomerId: input.newCustomerId,
          newPartnerId: input.newPartnerId,
          newLinkId: input.newLinkId,
          programId: input.programId,
          oldPartnerId: input.oldPartnerId,
        }),
      );
    });

    if (input.createClawback) {
      const newCustomer = await context.run(
        "load-new-customer-country",
        async () => {
          return await prisma.customer.findUnique({
            where: { id: input.newCustomerId },
            select: { country: true },
          });
        },
      );

      await context.run("optional-clawback", async () => {
        return logAndReturn(
          await createClawbackAndReplacementCommissions({
            oldCustomerId: input.oldCustomerId,
            newCustomerId: input.newCustomerId,
            oldPartnerId: input.oldPartnerId,
            newPartnerId: input.newPartnerId,
            newLinkId: input.newLinkId,
            programId: input.programId,
            customerCountry: newCustomer?.country ?? null,
          }),
        );
      });
    }

    await context.run("delete-old-events", async () => {
      try {
        await deleteOldCustomerTinybirdEvents({
          oldCustomerId: input.oldCustomerId,
          oldClickId: input.oldClickId,
        });

        return logAndReturn({ deleted: true });
      } catch (error) {
        throw new WorkflowRetryAfterError(
          error instanceof Error
            ? error.message
            : "Failed to delete old Tinybird events",
          "10s",
        );
      }
    });

    await context.run("decrement-old-link-stats", async () => {
      return logAndReturn(
        await decrementOldLinkStats({
          oldCustomerId: input.oldCustomerId,
          oldLinkId: input.oldLinkId,
          oldPartnerId: input.oldPartnerId,
          programId: input.programId,
          plan,
          decrementConversions: input.decrementConversions,
        }),
      );
    });
  },
  {
    initialPayloadParser: (requestPayload) => {
      const payload =
        typeof requestPayload === "string"
          ? JSON.parse(requestPayload)
          : requestPayload;

      return reattributeCustomerWorkflowSchema.parse(payload);
    },
    failureFunction: async ({
      context,
      failStatus,
      failResponse,
      failHeaders,
    }) => {
      logger.error("workflow.failed", {
        service: "qstash",
        event: "workflow.failed",
        workflowType: "reattribute-customer",
        workflowRunId: context.workflowRunId,
        failStatus,
        failResponse,
        failHeaders,
      });

      await logger.flush();
    },
  },
);
