import { triggerAggregateDueCommissionsCronJob } from "@/lib/actions/partners/trigger-aggregate-due-commissions";
import { Session } from "@/lib/auth";
import { triggerWorkflows } from "@/lib/cron/qstash-workflow";
import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import { createCommissionBodySchema } from "@/lib/zod/schemas/commissions";
import { prisma } from "@dub/prisma";
import { Project } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { DubApiError } from "../errors";
import { getProgramEnrollmentOrThrow } from "../programs/get-program-enrollment-or-throw";

type createCommissionsParams = z.infer<typeof createCommissionBodySchema> & {
  workspace: Pick<Project, "id" | "stripeConnectId">;
  programId: string;
  user: Session["user"];
};

export async function createCommissions(params: createCommissionsParams) {
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

    await createPartnerCommission({
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

    return;
  }

  if (links.length === 0) {
    throw new DubApiError({
      code: "bad_request",
      message: `Partner ${partner.email} (${partner.id}) has no links.`,
    });
  }

  // Check the link is valid
  if (params.linkId) {
    const link = links.find((l) => l.id === params.linkId);

    if (!link) {
      throw new DubApiError({
        code: "not_found",
        message: `Link ${params.linkId} does not belong to partner ${partner.email} (${partnerId}).`,
      });
    }
  }

  // Check the customer is valid
  if (params.customerId) {
    const customer = await prisma.customer.findUnique({
      where: {
        id: params.customerId,
      },
    });

    if (!customer) {
      throw new DubApiError({
        code: "not_found",
        message: `Customer ${params.customerId} not found.`,
      });
    }

    if (customer.projectId !== workspace.id) {
      throw new DubApiError({
        code: "bad_request",
        message: `Customer ${params.customerId} does not belong to workspace ${workspace.id}.`,
      });
    }
  }

  if (type === "sale") {
    if (params.invoiceId) {
      const commission = await prisma.commission.findUnique({
        where: {
          invoiceId_programId: {
            invoiceId: params.invoiceId,
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
          message: `There is already a commission for the invoice ${params.invoiceId}.`,
        });
      }
    }

    if (params.importStripeInvoices && !workspace.stripeConnectId) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Your workspace isn't connected to Stripe yet. Please install the Stripe integration under /settings/integrations/stripe to proceed.",
      });
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
