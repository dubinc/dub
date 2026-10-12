import { isFirstConversion } from "@/lib/analytics/is-first-conversion";
import { createId } from "@/lib/api/create-id";
import { getCustomerOrThrow } from "@/lib/api/customers/get-customer-or-throw";
import {
  CUSTOMER_REATTRIBUTION_EVENTS_LIMIT,
  getCustomerReattributeEvents,
  isReattributedCustomerStub,
  recreateCustomerForReattribution,
  rollbackCustomerRecreation,
} from "@/lib/api/customers/reattribute-customer";
import { transformCustomer } from "@/lib/api/customers/transform-customer";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { dispatchWorkflows } from "@/lib/jobs/publish-workflows";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import {
  CustomerEnrichedSchema,
  reattributeCustomerBodySchema,
} from "@/lib/zod/schemas/customers";
import { INACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { ACME_WORKSPACE_ID, nanoid } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

// POST /api/customers/:id/reattribute – Reattribute a customer to a different partner
export const POST = withWorkspace(
  async ({ workspace, params, req }) => {
    const { id } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);
    const { partnerId, linkId, createClawback } =
      reattributeCustomerBodySchema.parse(await parseRequestBody(req));

    if (workspace.id !== ACME_WORKSPACE_ID) {
      await assertRateLimit({
        policy: RATELIMIT_POLICIES.reattributeCustomer,
        identifier: workspace.id,
      });
    }

    const customer = await getCustomerOrThrow({
      id,
      workspaceId: workspace.id,
    });

    if (isReattributedCustomerStub(customer)) {
      throw new DubApiError({
        code: "bad_request",
        message: `Customer "${customer.id}" was already reattributed. Use the new customer ID instead.`,
      });
    }

    if (customer.partnerId === partnerId) {
      throw new DubApiError({
        code: "bad_request",
        message: `Customer "${customer.id}" is already attributed to the partner "${partnerId}".`,
      });
    }

    const enrollment = await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      include: {},
    });

    if (INACTIVE_ENROLLMENT_STATUSES.includes(enrollment.status)) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: "This partner is not eligible to receive customers.",
      });
    }

    const link = await prisma.link.findUnique({
      where: {
        id: linkId,
      },
      select: {
        id: true,
        projectId: true,
        programId: true,
        partnerId: true,
      },
    });

    if (
      !link ||
      link.projectId !== workspace.id ||
      link.programId !== programId ||
      link.partnerId !== partnerId
    ) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message:
          "The selected referral link does not belong to this partner in the program.",
      });
    }

    const [events, commissionCount] = await Promise.all([
      getCustomerReattributeEvents(customer.id),
      prisma.commission.count({
        where: {
          customerId: customer.id,
        },
      }),
    ]);

    if (events.length >= CUSTOMER_REATTRIBUTION_EVENTS_LIMIT) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: `This customer has at least ${CUSTOMER_REATTRIBUTION_EVENTS_LIMIT} events, so their full history cannot be moved.`,
      });
    }

    // No events, commissions, click, or sales to move, so update this customer in place.
    const hasNoHistory =
      events.length === 0 &&
      commissionCount === 0 &&
      !customer.clickId &&
      customer.sales === 0;

    if (hasNoHistory) {
      const updatedCustomer = await prisma.customer
        .update({
          where: {
            id: customer.id,
            partnerId: customer.partnerId,
            linkId: customer.linkId,
          },
          data: {
            partnerId: link.partnerId,
            linkId: link.id,
            programId: link.programId,
          },
          include: {
            link: {
              include: {
                linkReward: {
                  select: {
                    discount: true,
                  },
                },
              },
            },
            programEnrollment: {
              include: {
                partner: true,
                discount: true,
              },
            },
          },
        })
        .catch((error) => {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025"
          ) {
            throw new DubApiError({
              code: "conflict",
              message: `Customer "${customer.id}" changed while being reattributed. Please try again.`,
            });
          }

          throw error;
        });

      return NextResponse.json(
        CustomerEnrichedSchema.parse(transformCustomer(updatedCustomer)),
      );
    }

    // Events, commissions, a click, or sales exist, so create a new customer and move the history.
    const newCustomerId = createId({ prefix: "cus_" });
    const newClickId = nanoid(16);
    const incrementConversions =
      customer.sales > 0 && isFirstConversion({ customer, linkId: link.id });
    const decrementConversions = customer.sales > 0 && Boolean(customer.linkId);

    await recreateCustomerForReattribution({
      customer,
      link,
      newCustomerId,
      newClickId,
    });

    const workflow = await dispatchWorkflows({
      name: "reattribute-customer-workflow",
      payload: {
        workspaceId: workspace.id,
        programId,
        oldCustomerId: customer.id,
        newCustomerId,
        oldLinkId: customer.linkId,
        newLinkId: link.id,
        oldPartnerId: customer.partnerId,
        newPartnerId: partnerId,
        oldClickId: customer.clickId,
        newClickId,
        createClawback,
        incrementConversions,
        decrementConversions,
      },
      options: {
        deduplicationId: `${customer.id}:${newCustomerId}`,
        flowControl: {
          key: workspace.id,
          parallelism: 1,
        },
        label: customer.id,
      },
    });

    if (workflow.failed > 0) {
      await rollbackCustomerRecreation({
        customer,
        newCustomerId,
      });

      const failedJobIds = workflow.results
        .filter((result) => result.status === "failed")
        .map((result) => result.id);

      if (failedJobIds.length > 0) {
        await prisma.job.deleteMany({
          where: {
            id: { in: failedJobIds },
          },
        });
      }

      throw new DubApiError({
        code: "internal_server_error",
        message:
          "Customer reattribution failed to start. Please try again in a moment.",
      });
    }

    const newCustomer = await getCustomerOrThrow(
      {
        id: newCustomerId,
        workspaceId: workspace.id,
      },
      {
        includeExpandedFields: true,
      },
    );

    return NextResponse.json(
      CustomerEnrichedSchema.parse(transformCustomer(newCustomer)),
    );
  },
  {
    requiredPlan: ["business", "advanced", "enterprise"],
    requiredRoles: ["owner", "member"],
  },
);
