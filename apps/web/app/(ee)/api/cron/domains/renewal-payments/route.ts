import { createId } from "@/lib/api/create-id";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { createPaymentIntent } from "@/lib/stripe/create-payment-intent";
import { prisma } from "@dub/prisma";
import { Invoice, Project, RegisteredDomain } from "@dub/prisma/client";
import { log } from "@dub/utils";
import { addDays, endOfDay, startOfDay } from "date-fns";
import { NextResponse } from "next/server";

/**
 * Daily cron job to create payment intents for `.link` domain renewals.
 *
 * Payment intents are created 14 days before domain expiration to ensure
 * timely processing and avoid domain expiration.
 */

export const dynamic = "force-dynamic";

interface GroupedWorkspace {
  workspace: Pick<Project, "id" | "stripeId" | "invoicePrefix">;
  domains: Pick<RegisteredDomain, "id" | "slug" | "expiresAt" | "renewalFee">[];
}

// GET /api/cron/domains/renewal-payments
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const targetDate = addDays(new Date(), 14);

    console.log("targetDate", targetDate);

    // Find all domains expiring in 14 days
    const domains = await prisma.registeredDomain.findMany({
      where: {
        autoRenewalDisabledAt: null,
        expiresAt: {
          gte: startOfDay(targetDate),
          lte: endOfDay(targetDate),
        },
      },
      include: {
        project: {
          select: {
            id: true,
            stripeId: true,
            invoicePrefix: true,
          },
        },
      },
    });

    if (domains.length === 0) {
      console.log(
        "No domains found expiring exactly 14 days from today. Skipping...",
      );
      return NextResponse.json(
        "No domains found expiring exactly 14 days from today.",
      );
    }

    console.table(domains, ["slug", "expiresAt", "renewalFee"]);

    // Group domains by workspaceId
    const groupedByWorkspace = domains.reduce(
      (acc, domain) => {
        const workspaceId = domain.projectId;

        if (!acc[workspaceId]) {
          acc[workspaceId] = {
            workspace: domain.project,
            domains: [],
          };
        }

        acc[workspaceId].domains.push({
          id: domain.id,
          slug: domain.slug,
          expiresAt: domain.expiresAt,
          renewalFee: domain.renewalFee,
        });

        return acc;
      },
      {} as Record<string, GroupedWorkspace>,
    );

    const invoices: Invoice[] = [];

    // Create invoice for each workspace + domains group
    for (const workspaceId in groupedByWorkspace) {
      const { workspace, domains } = groupedByWorkspace[workspaceId];

      const invoice = await prisma.$transaction(async (tx) => {
        // Generate the next invoice number by counting the number of invoices for the workspace
        const totalInvoices = await tx.invoice.count({
          where: {
            workspaceId: workspace.id,
          },
        });
        const paddedNumber = String(totalInvoices + 1).padStart(4, "0");
        const invoiceNumber = `${workspace.invoicePrefix}-${paddedNumber}`;

        const totalAmount = domains.reduce(
          (acc, domain) => acc + domain.renewalFee,
          0,
        );

        return await tx.invoice.create({
          data: {
            id: createId({ prefix: "inv_" }),
            workspaceId: workspace.id,
            number: invoiceNumber,
            type: "domainRenewal",
            amount: totalAmount,
            total: totalAmount,
            registeredDomains: domains.map(({ slug }) => slug), // array of domain slugs,
          },
        });
      });

      console.log(
        `Invoice ${invoice.id} with total ${invoice.total} created for workspace ${workspace.id} to renew ${domains.length} domains.`,
      );

      invoices.push(invoice);
    }

    // Create payment intent for each invoice
    for (const invoice of invoices) {
      const { workspace } = groupedByWorkspace[invoice.workspaceId];

      if (!workspace.stripeId) {
        console.log(`Workspace ${workspace.id} has no stripeId, skipping...`);
        continue;
      }

      const res = await createPaymentIntent({
        stripeId: workspace.stripeId!,
        amount: invoice.total,
        invoiceId: invoice.id,
        statementDescriptor: "Dub",
        description: `Domain renewal invoice (${invoice.id})`,
        idempotencyKey: `${invoice.id}-${invoice.failedAttempts}`,
      });

      console.log(`Payment intent created for invoice ${invoice.id}`, res);
    }

    return NextResponse.json("OK");
  } catch (error) {
    await log({
      message: "Domains renewal cron failed. Error: " + error.message,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
