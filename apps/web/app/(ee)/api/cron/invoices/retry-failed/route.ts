import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@/lib/prisma";
import { createPaymentIntent } from "@/lib/stripe/create-payment-intent";
import { ACME_WORKSPACE_ID, DUB_WORKSPACE_ID } from "@dub/utils";
import * as z from "zod/v4";

export const dynamic = "force-dynamic";

const schema = z.object({
  invoiceId: z.string().min(1),
});

// POST /api/cron/invoices/retry-failed
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const { invoiceId } = schema.parse(JSON.parse(rawBody));

    const invoice = await prisma.invoice.findUnique({
      where: {
        id: invoiceId,
      },
      select: {
        id: true,
        type: true,
        status: true,
        total: true,
        failedAttempts: true,
        workspace: {
          select: {
            id: true,
            stripeId: true,
          },
        },
      },
    });

    if (!invoice) {
      console.log(`Invoice ${invoiceId} not found.`);
      return new Response(`Invoice ${invoiceId} not found.`);
    }

    if (invoice.status !== "failed") {
      console.log(`Invoice ${invoiceId} is not failed.`);
      return new Response(`Invoice ${invoiceId} is not failed.`);
    }

    if (invoice.failedAttempts >= 3) {
      console.log(`Invoice ${invoiceId} has reached max failed attempts of 3.`);
      return new Response(
        `Invoice ${invoiceId} has reached max failed attempts of 3.`,
      );
    }

    if (invoice.type !== "domainRenewal") {
      console.log(`Only domain renewals can be retried at this time.`);
      return new Response(`Only domain renewals can be retried at this time.`);
    }

    let { workspace } = invoice;

    // If Acme workspace, use Dub workspace stripeId
    if (workspace.id === ACME_WORKSPACE_ID) {
      const dubWorkspace = await prisma.project.findUniqueOrThrow({
        where: {
          id: DUB_WORKSPACE_ID,
        },
        select: {
          stripeId: true,
        },
      });

      workspace = {
        ...workspace,
        stripeId: dubWorkspace.stripeId,
      };
    }

    if (!workspace.stripeId) {
      console.log(`Workspace ${workspace.id} has no stripeId.`);
      return new Response(`Workspace ${workspace.id} has no stripeId.`);
    }

    await createPaymentIntent({
      stripeId: workspace.stripeId,
      amount: invoice.total,
      invoiceId: invoice.id,
      statementDescriptor: "DUB.CO DOMAIN RENEWAL",
      description: `Domain renewal invoice (${invoice.id})`,
      idempotencyKey: `${invoice.id}-${invoice.failedAttempts}`,
    });

    return new Response(`Retrying invoice charge ${invoice.id}...`);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
