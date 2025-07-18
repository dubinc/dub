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
    console.log(
      "Invoice with Stripe ID *`" +
        stripeId +
        "`* not found in invoice.payment_failed event",
    );
    return;
  }

  const workspace = await prisma.project.findUnique({
    where: {
      stripeId: stripeId.toString(),
    },
    select: {
      id: true,
      name: true,
      slug: true,
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
    console.log(
      "Workspace with Stripe ID *`" +
        stripeId +
        "`* not found in invoice.payment_failed event",
    );
    return;
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
        email: user.email as string,
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
}
