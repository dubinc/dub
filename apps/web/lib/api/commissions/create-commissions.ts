import { triggerAggregateDueCommissionsCronJob } from "@/lib/actions/partners/trigger-aggregate-due-commissions";
import { Session } from "@/lib/auth";
import { triggerWorkflows } from "@/lib/cron/qstash-workflow";
import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import { createCommissionBodySchema } from "@/lib/zod/schemas/commissions";
import { prisma } from "@dub/prisma";
import { Customer, Project } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { DubApiError } from "../errors";
import { getProgramEnrollmentOrThrow } from "../programs/get-program-enrollment-or-throw";

type CreateCommissionsParams = z.infer<typeof createCommissionBodySchema> & {
  workspace: Pick<Project, "id" | "slug" | "stripeConnectId">;
  programId: string;
  user: Session["user"];
};

export async function createCommissions(params: CreateCommissionsParams) {
  const { workspace, programId, partnerId, type, user, ...rest } = params;

  const { partner, links } = await getProgramEnrollmentOrThrow({
    programId,
    partnerId,
    include: {
      partner: true,
      links: true,
    },
  });

  // Create a custom commission
  if (type === "custom") {
    const { amount, date, description, user } = params;

    const { commission } = await createPartnerCommission({
      event: "custom",
      programId,
      partnerId,
      amount,
      quantity: 1,
      createdAt: date ?? new Date(),
      description,
      user,
    });

    waitUntil(triggerAggregateDueCommissionsCronJob(programId));

    return commission;
  }

  if (links.length === 0) {
    throw new DubApiError({
      code: "bad_request",
      message: `Partner ${partner.email} (${partner.id}) has no links.`,
    });
  }

  const { linkId, customerId, customer } = params;

  // Check the link is valid
  if (linkId) {
    const link = links.find((l) => l.id === linkId);

    if (!link) {
      throw new DubApiError({
        code: "not_found",
        message: `Link ${linkId} does not belong to partner ${partner.email} (${partnerId}).`,
      });
    }
  }

  let customerFound: Customer | null = null;

  // Check the customer is valid
  if (customerId) {
    customerFound = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
    });

    if (!customerFound) {
      throw new DubApiError({
        code: "not_found",
        message: `Customer ${customerId} not found.`,
      });
    }

    if (customerFound.projectId !== workspace.id) {
      throw new DubApiError({
        code: "bad_request",
        message: `Customer ${customerId} does not belong to workspace ${workspace.id}.`,
      });
    }
  }

  if (!customerId && !customer) {
    throw new DubApiError({
      code: "bad_request",
      message: "Either customerId or customer must be provided.",
    });
  }

  if (customerId && customer) {
    throw new DubApiError({
      code: "bad_request",
      message: "Either customerId or customer must be provided, not both.",
    });
  }

  if (type === "sale") {
    const {
      importStripeInvoices,
      saleAmount,
      saleEventDate,
      invoiceId,
      productId,
    } = params;

    if (!importStripeInvoices && !saleAmount) {
      throw new DubApiError({
        code: "bad_request",
        message: "Either saleAmount or importStripeInvoices must be provided.",
      });
    }

    const hasManualSaleFields =
      saleAmount || saleEventDate || invoiceId || productId;

    if (importStripeInvoices) {
      if (hasManualSaleFields) {
        throw new DubApiError({
          code: "bad_request",
          message:
            "saleAmount, saleEventDate, invoiceId, and productId cannot be provided when importStripeInvoices is enabled.",
        });
      }

      if (!workspace.stripeConnectId) {
        throw new DubApiError({
          code: "bad_request",
          message: `Your workspace isn't connected to Stripe yet. Please install the Stripe integration to continue: https://app.dub.co/${workspace.slug}/settings/integrations/stripe`,
        });
      }

      if (customerFound && !customerFound.stripeCustomerId) {
        throw new DubApiError({
          code: "bad_request",
          message: `Customer ${customerFound.id} does not have a Stripe Customer ID configured. Please update the customer record at https://app.dub.co/${workspace.slug}/program/customers/${customerFound.id}`,
        });
      }
    }

    if (invoiceId) {
      const commission = await prisma.commission.findUnique({
        where: {
          invoiceId_programId: {
            invoiceId,
            programId,
          },
        },
        select: {
          id: true,
        },
      });

      if (commission) {
        throw new DubApiError({
          code: "bad_request",
          message: `There is already a commission for the invoice ${invoiceId}.`,
        });
      }
    }
  }

  await triggerWorkflows({
    workflowId: "create-commissions",
    body: {
      body: {
        ...rest,
        partnerId,
        type,
      },
      programId,
      userId: user.id,
    },
  });
}
