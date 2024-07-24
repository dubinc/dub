import { prisma } from "@/lib/prisma";
import { log } from "@dub/utils";
import { sendEmail } from "emails";
import FailedPayment from "emails/failed-payment";
import Stripe from "stripe";

export async function invoicePaymentFailed(event: Stripe.Event) {
  const {
    customer: stripeId,
    attempt_count: attemptCount,
    amount_due: amountDue,
  } = event.data.object as Stripe.Invoice;

  if (!stripeId) {
    await log({
      message: "Missing customer ID in invoice.payment_failed event",
      type: "errors",
    });
    return;
  }

  const workspace = await prisma.project.findUnique({
    where: {
      stripeId: stripeId.toString(),
    },
    select: {
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
    await log({
      message: `Project with Stripe ID ${stripeId} not found in invoice.payment_failed event`,
      type: "errors",
    });
    return;
  }

  await Promise.allSettled(
    workspace.users.map(({ user }) =>
      sendEmail({
        email: user.email as string,
        from: "steven@dub.co",
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
      }),
    ),
  );
}
