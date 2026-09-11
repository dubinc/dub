import { isFirstConversion } from "@/lib/analytics/is-first-conversion";
import { createId } from "@/lib/api/create-id";
import { getCustomerOrThrow } from "@/lib/api/customers/get-customer-or-throw";
import {
  CUSTOMER_EVENTS_LIMIT,
  getCustomerReattributeEvents,
  recreateCustomerForReattribution,
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
import { nanoid } from "@dub/utils";
import { NextResponse } from "next/server";

// POST /api/customers/:id/reattribute – Reattribute a customer to a different partner
export const POST = withWorkspace(
  async ({ workspace, params, req }) => {
    const { id } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);
    const { partnerId, linkId, createClawback } =
      reattributeCustomerBodySchema.parse(await parseRequestBody(req));

    await assertRateLimit({
      policy: RATELIMIT_POLICIES.reattributeCustomer,
      identifier: workspace.id,
    });

    const customer = await getCustomerOrThrow(
      {
        id,
        workspaceId: workspace.id,
      },
      {
        includeExpandedFields: true,
      },
    );

    if (
      customer.externalId?.startsWith("dummy_") &&
      customer.partnerId == null &&
      customer.linkId == null &&
      customer.programId == null
    ) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "This customer was already reattributed. Use the new customer ID.",
      });
    }

    if (customer.partnerId === partnerId && customer.linkId === linkId) {
      throw new DubApiError({
        code: "bad_request",
        message: "Customer is already attributed to this partner and link.",
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

    if (events.length >= CUSTOMER_EVENTS_LIMIT) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: `This customer has too many events to reattribute (limit ${CUSTOMER_EVENTS_LIMIT}).`,
      });
    }

    if (
      events.length === 0 &&
      commissionCount === 0 &&
      !customer.clickId &&
      customer.sales === 0
    ) {
      const updatedCustomer = await prisma.customer.update({
        where: {
          id: customer.id,
        },
        data: {
          partnerId: link.partnerId,
          linkId: link.id,
          programId: link.programId,
        },
      });

      const enrichedCustomer = await getCustomerOrThrow(
        {
          id: updatedCustomer.id,
          workspaceId: workspace.id,
        },
        {
          includeExpandedFields: true,
        },
      );

      return NextResponse.json(
        CustomerEnrichedSchema.parse(transformCustomer(enrichedCustomer)),
      );
    }

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

    await dispatchWorkflows({
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
