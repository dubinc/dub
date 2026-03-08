import { sendEmail } from "@dub/email";
import FailedPayment from "@dub/email/templates/failed-payment";
import { prisma } from "@dub/prisma";
import Stripe from "stripe";

export async function invoicePaymentFailed(event: Stripe.Event) {
  const {
    customer: stripeId,
    attempt_count: attemptCount,
    amount_due: amountDue,
  } = event.data.object as Stripe.Invoice;

  if (!stripeId) {
    return "No customer found in invoice.payment_failed event.";
  }

  const workspace = await prisma.project.findUnique({
    where: {
      stripeId: stripeId.toString(),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      defaultProgramId: true,
      users: {
        select: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        where: {
          user: {
            isMachine: false,
          },
        },
      },
    },
  });

  if (!workspace) {
    return `Workspace with Stripe ID ${stripeId} not found in invoice.payment_failed event.`;
  }

  await Promise.allSettled([
    prisma.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        paymentFailedAt: new Date(),
      },
    }),
    ...workspace.users.map(({ user }) =>
      sendEmail({
        to: user.email as string,
        subject: `${
          attemptCount == 2
            ? "2nd notice: "
            : attemptCount == 3
              ? "3rd notice: "
              : ""
        }Your payment for Dub.co failed`,
        react: (
          <FailedPayment
            attemptCount={attemptCount}
            amountDue={amountDue}
            user={{
              name: user.name,
              email: user.email as string,
            }}
            workspace={workspace}
          />
        ),
        variant: "notifications",
      }),
    ),
  ]);

  return `Recorded payment failure and sent ${workspace.users.length} notice(s) for workspace ${workspace.slug}.`;
}
