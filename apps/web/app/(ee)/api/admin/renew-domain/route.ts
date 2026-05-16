import { createId } from "@/lib/api/create-id";
import { withAdmin } from "@/lib/auth";
import { createPaymentIntent } from "@/lib/stripe/create-payment-intent";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const schema = z.object({
  domain: z.string().min(1),
});

// POST /api/admin/renew-domain
export const POST = withAdmin(async ({ req }) => {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const normalized = normalizeDomainInput(parsed.data.domain);
  if (!normalized) {
    return NextResponse.json({ error: "Invalid domain." }, { status: 400 });
  }

  const registered = await prisma.registeredDomain.findFirst({
    where: { slug: normalized },
    select: {
      slug: true,
      renewalFee: true,
      projectId: true,
      project: {
        select: {
          id: true,
          stripeId: true,
          invoicePrefix: true,
        },
      },
    },
  });

  if (!registered) {
    return NextResponse.json(
      { error: `No registered domain found for "${normalized}".` },
      { status: 404 },
    );
  }

  if (!registered.project.stripeId) {
    return NextResponse.json(
      { error: "Workspace has no Stripe customer; add billing first." },
      { status: 400 },
    );
  }

  if (!registered.renewalFee || registered.renewalFee <= 0) {
    return NextResponse.json(
      { error: `Domain "${normalized}" has no valid renewal fee configured.` },
      { status: 400 },
    );
  }

  const outcome = await prisma.$transaction(async (tx) => {
    const pendingInvoices = await tx.invoice.findMany({
      where: {
        workspaceId: registered.projectId,
        type: "domainRenewal",
        status: "processing",
      },
      select: {
        registeredDomains: true,
      },
    });

    const hasPendingForSlug = pendingInvoices.some((inv) => {
      const slugs = inv.registeredDomains as string[] | null;
      return (
        Array.isArray(slugs) &&
        (slugs.includes(registered.slug) || slugs.includes(normalized))
      );
    });

    if (hasPendingForSlug) {
      return { ok: false as const };
    }

    const totalInvoices = await tx.invoice.count({
      where: {
        workspaceId: registered.projectId,
      },
    });
    const paddedNumber = String(totalInvoices + 1).padStart(4, "0");
    const invoiceNumber = `${registered.project.invoicePrefix}-${paddedNumber}`;
    const renewalFee = registered.renewalFee;

    const invoice = await tx.invoice.create({
      data: {
        id: createId({ prefix: "inv_" }),
        workspaceId: registered.projectId,
        number: invoiceNumber,
        type: "domainRenewal",
        amount: renewalFee,
        total: renewalFee,
        registeredDomains: [registered.slug],
      },
    });

    return { ok: true as const, invoice };
  });

  if (!outcome.ok) {
    return NextResponse.json(
      {
        error:
          "A domain renewal charge is already processing for this domain. Wait for it to complete or fail before retrying.",
      },
      { status: 409 },
    );
  }

  const invoice = outcome.invoice;

  const { paymentIntent } = await createPaymentIntent({
    stripeId: registered.project.stripeId!,
    amount: invoice.total,
    invoiceId: invoice.id,
    statementDescriptor: "DUB.CO DOMAIN RENEWAL",
    description: `Domain renewal invoice (${invoice.id})`,
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

    return NextResponse.json(
      {
        error: "Could not charge the workspace payment method.",
        invoiceId: invoice.id,
      },
      { status: 422 },
    );
  }

  const status = paymentIntent.status;

  if (status === "succeeded") {
    return NextResponse.json({
      success: true,
      message:
        "Charge succeeded. Domain renewal will finalize via Stripe webhook (updates expiry and Dynadot auto-renew).",
      invoiceId: invoice.id,
      paymentIntentStatus: status,
    });
  }

  return NextResponse.json({
    success: true,
    message:
      "Payment initiated. If the payment is not yet succeeded, the customer may need to complete authentication; Stripe webhooks will update the invoice.",
    invoiceId: invoice.id,
    paymentIntentStatus: status,
  });
});

function normalizeDomainInput(raw: string): string {
  let s = raw.trim().toLowerCase();
  if (!s) {
    return s;
  }
  try {
    if (s.includes("://")) {
      const url = new URL(s);
      s = url.hostname;
    } else if (s.includes("/")) {
      const url = new URL(`https://${s}`);
      s = url.hostname;
    }
  } catch {
    // keep s as typed
  }
  if (s.startsWith("www.")) {
    s = s.slice(4);
  }
  return s;
}
