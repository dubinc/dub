import { createId } from "@/lib/api/create-id";
import { parseRegisteredDomainSlugs } from "@/lib/api/domains/is-domain-registration-invoice";
import { DubApiError } from "@/lib/api/errors";
import { searchDomainsAvailability } from "@/lib/dynadot/search-domains";
import { prisma } from "@/lib/prisma";
import { createPaymentIntent } from "@/lib/stripe/create-payment-intent";
import { isWorkspaceBillingTrialActive } from "@dub/utils";
import { Project } from "@prisma/client";

export async function initiatePremiumDomainRegistration({
  domain,
  workspace,
  skipWorkspaceChecks = false,
}: {
  domain: string;
  workspace: Pick<
    Project,
    "id" | "slug" | "plan" | "stripeId" | "trialEndsAt" | "invoicePrefix"
  >;
  skipWorkspaceChecks?: boolean;
}) {
  if (!skipWorkspaceChecks) {
    if (workspace.plan === "free") {
      throw new DubApiError({
        code: "forbidden",
        message: "Free workspaces cannot register .link domains.",
      });
    }

    if (isWorkspaceBillingTrialActive(workspace.trialEndsAt)) {
      throw new DubApiError({
        code: "forbidden",
        message: "You cannot register a .link domain during your free trial.",
      });
    }
  }

  if (!workspace.stripeId) {
    throw new DubApiError({
      code: "forbidden",
      message:
        "You cannot register a premium .link domain until you add a payment method.",
    });
  }

  const [searchResults, existingDomain] = await Promise.all([
    searchDomainsAvailability({
      domains: { domain0: domain },
    }),
    prisma.domain.findUnique({
      where: {
        slug: domain,
        verified: true,
      },
    }),
  ]);

  if (existingDomain) {
    throw new DubApiError({
      code: "conflict",
      message: `Domain "${domain}" is already registered.`,
    });
  }

  const domainStatus = searchResults[0];

  if (!domainStatus?.available) {
    throw new DubApiError({
      code: "bad_request",
      message: `Domain "${domain}" is not available for registration.`,
    });
  }

  if (!domainStatus.premium || !domainStatus.prices?.registration) {
    throw new DubApiError({
      code: "bad_request",
      message: `Domain "${domain}" is not a premium domain.`,
    });
  }

  const registrationPriceCents = domainStatus.prices.registration;

  const outcome = await prisma.$transaction(async (tx) => {
    const pendingInvoices = await tx.invoice.findMany({
      where: {
        workspaceId: workspace.id,
        type: "domainRenewal",
        status: "processing",
      },
      select: {
        registeredDomains: true,
      },
    });

    const hasPendingForSlug = pendingInvoices.some((inv) =>
      parseRegisteredDomainSlugs(inv.registeredDomains).includes(domain),
    );

    if (hasPendingForSlug) {
      return { ok: false as const };
    }

    const totalInvoices = await tx.invoice.count({
      where: {
        workspaceId: workspace.id,
      },
    });
    const paddedNumber = String(totalInvoices + 1).padStart(4, "0");
    const invoiceNumber = `${workspace.invoicePrefix}-${paddedNumber}`;

    const invoice = await tx.invoice.create({
      data: {
        id: createId({ prefix: "inv_" }),
        workspaceId: workspace.id,
        number: invoiceNumber,
        type: "domainRenewal",
        amount: registrationPriceCents,
        total: registrationPriceCents,
        registeredDomains: [domain],
      },
    });

    return { ok: true as const, invoice, registrationPriceCents };
  });

  if (!outcome.ok) {
    throw new DubApiError({
      code: "conflict",
      message:
        "A premium domain registration charge is already processing for this domain. Wait for it to complete or fail before retrying.",
    });
  }

  const { invoice } = outcome;

  const { paymentIntent } = await createPaymentIntent({
    stripeId: workspace.stripeId,
    amount: registrationPriceCents,
    invoiceId: invoice.id,
    statementDescriptor: "DUB.CO DOMAIN REG",
    description: `Premium domain registration (${domain})`,
    idempotencyKey: `${invoice.id}-${invoice.failedAttempts}`,
  });

  if (!paymentIntent) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "failed",
        failedReason: "Could not charge the workspace payment method.",
      },
    });

    throw new DubApiError({
      code: "unprocessable_entity",
      message: "Could not charge the workspace payment method.",
    });
  }

  return {
    invoiceId: invoice.id,
    paymentIntentStatus: paymentIntent.status,
    registrationPriceCents,
  };
}
