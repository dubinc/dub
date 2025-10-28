import { qstash } from "@/lib/cron";
import { setRenewOption } from "@/lib/dynadot/set-renew-option";
import { sendBatchEmail } from "@dub/email";
import DomainRenewed from "@dub/email/templates/domain-renewed";
import { prisma } from "@dub/prisma";
import { Invoice } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, pluralize } from "@dub/utils";
import { addDays } from "date-fns";
import Stripe from "stripe";

export async function chargeSucceeded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;

  const { transfer_group: invoiceId } = charge;

  if (!invoiceId) {
    console.log("No transfer group found, skipping...");
    return;
  }

  let invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
  });

  if (!invoice) {
    console.log(`Invoice with transfer group ${invoiceId} not found.`);
    return;
  }

  if (invoice.status === "completed") {
    console.log(`Invoice ${invoice.id} already completed, skipping...`);
    return;
  }

  invoice = await prisma.invoice.update({
    where: {
      id: invoice.id,
    },
    data: {
      receiptUrl: charge.receipt_url,
      status: "completed",
      paidAt: new Date(),
      stripeChargeMetadata: JSON.parse(JSON.stringify(charge)),
    },
  });

  if (invoice.type === "partnerPayout") {
    await processPayoutInvoice({ invoice });
  } else if (invoice.type === "domainRenewal") {
    await processDomainRenewalInvoice({ invoice });
  }
}

async function processPayoutInvoice({ invoice }: { invoice: Invoice }) {
  const payoutsToProcess = await prisma.payout.count({
    where: {
      invoiceId: invoice.id,
      status: {
        not: "completed",
      },
    },
  });

  if (payoutsToProcess === 0) {
    console.log(
      `No payouts to process found for invoice ${invoice.id}, skipping...`,
    );
    return;
  }

  const qstashResponse = await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/charge-succeeded`,
    body: {
      invoiceId: invoice.id,
    },
  });

  if (qstashResponse.messageId) {
    console.log(`Message sent to Qstash with id ${qstashResponse.messageId}`);
  } else {
    console.error("Error sending message to Qstash", qstashResponse);
  }
}

async function processDomainRenewalInvoice({ invoice }: { invoice: Invoice }) {
  const domains = await prisma.registeredDomain.findMany({
    where: {
      slug: {
        in: invoice.registeredDomains as string[],
      },
    },
    orderBy: {
      expiresAt: "asc",
    },
  });

  if (domains.length === 0) {
    console.log(`No domains found for invoice ${invoice.id}, skipping...`);
    return;
  }

  const newExpiresAt = addDays(domains[0].expiresAt, 365);

  await prisma.registeredDomain.updateMany({
    where: {
      id: {
        in: domains.map(({ id }) => id),
      },
    },
    data: {
      expiresAt: newExpiresAt,
      autoRenewalDisabledAt: null,
    },
  });

  await Promise.allSettled(
    domains.map((domain) =>
      setRenewOption({
        domain: domain.slug,
        autoRenew: true,
      }),
    ),
  );

  const workspace = await prisma.project.findUniqueOrThrow({
    where: {
      id: invoice.workspaceId,
    },
    include: {
      users: {
        where: {
          role: "owner",
        },
        select: {
          user: true,
        },
      },
    },
  });

  const workspaceOwners = workspace.users.filter(({ user }) => user.email);

  if (workspaceOwners.length === 0) {
    console.log("No users found to send domain renewal success email.");
    return;
  }

  await sendBatchEmail(
    workspaceOwners.map(({ user }) => ({
      variant: "notifications",
      to: user.email!,
      subject: `Your ${pluralize("domain", domains.length)} have been renewed`,
      react: DomainRenewed({
        email: user.email!,
        workspace: {
          slug: workspace.slug,
        },
        domains: domains.map(({ slug }) => ({ slug })),
        expiresAt: newExpiresAt,
      }),
    })),
  );
}
