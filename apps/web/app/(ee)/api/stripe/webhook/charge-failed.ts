import { qstash } from "@/lib/cron";
import { setRenewOption } from "@/lib/dynadot/set-renew-option";
import {
  DIRECT_DEBIT_PAYMENT_METHOD_TYPES,
  PAYOUT_FAILURE_FEE_CENTS,
} from "@/lib/partners/constants";
import { createPaymentIntent } from "@/lib/stripe/create-payment-intent";
import { sendBatchEmail, sendEmail } from "@dub/email";
import DomainExpired from "@dub/email/templates/domain-expired";
import DomainRenewalFailed from "@dub/email/templates/domain-renewal-failed";
import PartnerPayoutFailed from "@dub/email/templates/partner-payout-failed";
import { prisma } from "@dub/prisma";
import { Invoice } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import Stripe from "stripe";

export async function chargeFailed(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;

  const { transfer_group: invoiceId, failure_message: failedReason } = charge;

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

  invoice = await prisma.invoice.update({
    where: {
      id: invoiceId,
    },
    data: {
      status: "failed",
      failedReason,
      failedAttempts: {
        increment: 1,
      },
    },
  });

  if (invoice.type === "partnerPayout") {
    await processPayoutInvoice({ invoice, charge });
  } else if (invoice.type === "domainRenewal") {
    await processDomainRenewalInvoice({ invoice });
  }
}

async function processPayoutInvoice({
  invoice,
  charge,
}: {
  invoice: Invoice;
  charge: Stripe.Charge;
}) {
  await log({
    message: `Partner payout failed for invoice ${invoice.id}.`,
    type: "errors",
    mention: true,
  });

  // Mark the payouts as pending again
  await prisma.payout.updateMany({
    where: {
      invoiceId: invoice.id,
    },
    data: {
      status: "pending",
      userId: null,
      invoiceId: null,
    },
  });

  const workspace = await prisma.project.update({
    where: {
      id: invoice.workspaceId,
    },
    // Reduce the payoutsUsage by the invoice amount since the charge failed
    data: {
      payoutsUsage: {
        decrement: invoice.amount,
      },
    },
    include: {
      users: {
        select: {
          user: {
            select: {
              email: true,
            },
          },
        },
      },
      programs: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!workspace.stripeId) {
    console.log("Workspace does not have a Stripe ID, skipping...");
    return;
  }

  let cardLast4: string | undefined;
  let chargedFailureFee = false;

  // Charge failure fee for direct debit payment failures
  if (
    charge.payment_method_details &&
    DIRECT_DEBIT_PAYMENT_METHOD_TYPES.includes(
      charge.payment_method_details.type as Stripe.PaymentMethod.Type,
    )
  ) {
    const { paymentIntent, paymentMethod } = await createPaymentIntent({
      stripeId: workspace.stripeId,
      amount: PAYOUT_FAILURE_FEE_CENTS,
      invoiceId: invoice.id,
      description: `Dub Partners payout failure fee for invoice ${invoice.id}`,
      statementDescriptor: "Dub Partners",
    });

    if (paymentIntent) {
      chargedFailureFee = true;
      console.log(
        `Charged a failure fee of $${PAYOUT_FAILURE_FEE_CENTS / 100} to ${workspace.slug}.`,
      );
    }

    if (paymentMethod?.card) {
      cardLast4 = paymentMethod.card.last4;
    }
  }

  waitUntil(
    (async () => {
      // Send email to the workspace users about the failed payout
      const emailData = workspace.users.map((user) => ({
        email: user.user.email!,
        workspace: {
          slug: workspace.slug,
        },
        program: {
          name: workspace.programs[0].name,
        },
        payout: {
          amount: charge.amount,
          ...(chargedFailureFee && {
            failureFee: PAYOUT_FAILURE_FEE_CENTS,
            cardLast4,
          }),
        },
      }));

      if (emailData.length === 0) {
        console.log("No users found to send email, skipping...");
        return;
      }

      await Promise.all(
        emailData.map((data) => {
          sendEmail({
            subject: "Partner payout failed",
            to: data.email,
            react: PartnerPayoutFailed(data),
            variant: "notifications",
          });
        }),
      );
    })(),
  );
}

async function processDomainRenewalInvoice({ invoice }: { invoice: Invoice }) {
  const domains = await prisma.registeredDomain.findMany({
    where: {
      slug: {
        in: invoice.registeredDomains as string[],
      },
    },
    select: {
      slug: true,
      expiresAt: true,
    },
  });

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

  // Domain renewal failed 3 times:
  // 1. Turn off auto-renew for the domains on Dynadot
  // 2. Disable auto-renew for the domains on Dub
  // 3. Send email to the workspace users
  if (invoice.failedAttempts >= 3) {
    await Promise.allSettled(
      domains.map((domain) =>
        setRenewOption({
          domain: domain.slug,
          autoRenew: false,
        }),
      ),
    );

    const updateDomains = await prisma.registeredDomain.updateMany({
      where: {
        slug: {
          in: domains.map(({ slug }) => slug),
        },
      },
      data: {
        autoRenewalDisabledAt: new Date(),
      },
    });
    console.log(
      `Updated autoRenewalDisabledAt for ${updateDomains.count} domains.`,
    );

    if (workspaceOwners.length > 0) {
      await sendBatchEmail(
        workspaceOwners.map(({ user }) => ({
          variant: "notifications",
          to: user.email!,
          subject: "Domain expired",
          react: DomainExpired({
            email: user.email!,
            workspace: {
              name: workspace.name,
              slug: workspace.slug,
            },
            domains,
          }),
        })),
      );
    }
  }

  // We'll retry the invoice 3 times, if it fails 3 times, we'll turn off auto-renew for the domains
  if (invoice.failedAttempts < 3) {
    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/invoices/retry-failed`,
      delay: 3 * 24 * 60 * 60, // 3 days in seconds
      deduplicationId: `${invoice.id}-attempt-${invoice.failedAttempts + 1}`,
      body: {
        invoiceId: invoice.id,
      },
    });

    if (workspaceOwners.length > 0) {
      await sendBatchEmail(
        workspaceOwners.map(({ user }) => ({
          variant: "notifications",
          to: user.email!,
          subject: "Domain renewal failed",
          react: DomainRenewalFailed({
            email: user.email!,
            workspace: {
              slug: workspace.slug,
            },
            domains,
          }),
        })),
      );
    }
  }
}
