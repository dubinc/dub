import { disableWorkspaceLinks } from "@/lib/api/workspaces/disable-workspace-links";
import { updateConfig } from "@/lib/edge-config";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { LEGAL_USER_ID, log } from "@dub/utils";
import Stripe from "stripe";

const STRIPE_FRAUD_VALUE_LISTS = {
  CUSTOMER_ID: "rsl_1LeVdvAlJJEpqkPVEcNgjxqq",
  CUSTOMER_EMAIL: "rsl_1LeVdvAlJJEpqkPVhZw9Xvgw",
  CARD_FINGERPRINT: "rsl_1LeVdvAlJJEpqkPVvUZUm9eC",
};

export async function paymentIntentPaymentFailed(
  event: Stripe.PaymentIntentPaymentFailedEvent,
) {
  const {
    customer,
    last_payment_error,
    receipt_email: customerEmail,
  } = event.data.object;

  // should never happen, but just in case
  if (!customer || !last_payment_error) {
    return `Invalid payment intent attributes: ${JSON.stringify({ customer, last_payment_error })}`;
  }

  const customerId = customer as string;

  const workspace = await prisma.project.findUnique({
    where: {
      stripeId: customerId,
    },
  });

  if (workspace) {
    return `Workspace with stripeId ${customer} already created, so this is most likely a recurring payment failure, skipping...`;
  }

  const { decline_code, payment_method } = last_payment_error;

  if (decline_code !== "fraudulent") {
    return `Irrelevant decline code: ${decline_code}, skipping...`;
  }

  const cardFingerprint = payment_method?.card?.fingerprint;

  // add to Stripe Fraud Value Lists
  await Promise.allSettled([
    stripe.radar.valueListItems.create({
      value_list: STRIPE_FRAUD_VALUE_LISTS.CUSTOMER_ID,
      value: customerId,
    }),
    customerEmail
      ? stripe.radar.valueListItems.create({
          value_list: STRIPE_FRAUD_VALUE_LISTS.CUSTOMER_EMAIL,
          value: customerEmail,
        })
      : null,
    cardFingerprint
      ? stripe.radar.valueListItems.create({
          value_list: STRIPE_FRAUD_VALUE_LISTS.CARD_FINGERPRINT,
          value: cardFingerprint,
        })
      : null,
  ]).then((results) => {
    results.forEach((result, idx) => {
      if (result.status === "fulfilled" && result.value) {
        const listItem = [customerId, customerEmail, cardFingerprint][idx];
        const listName = Object.entries(STRIPE_FRAUD_VALUE_LISTS)[idx][0];
        console.log(
          `Added ${listItem} to ${listName} Fraud Value List: ${JSON.stringify(result.value, null, 2)}`,
        );
      }
    });
  });

  if (customerEmail) {
    const user = await prisma.user.findUnique({
      where: {
        email: customerEmail,
      },
      include: {
        projects: {
          where: {
            role: "owner",
          },
          select: {
            project: true,
          },
        },
      },
    });

    if (user) {
      const workspaces = user.projects.map(({ project }) => project);
      if (workspaces.length > 0) {
        for (const workspace of workspaces) {
          // this should never happen, but just in case
          if (workspace.plan !== "free") {
            await log({
              type: "errors",
              message: `[payment_intent.payment_failed]: Workspace ${workspace.slug} for fraudulent user ${user.email} is not a free plan, skipping...`,
            });
            continue;
          }
          // transfer ownership to legal user
          await prisma.projectUsers.update({
            where: {
              userId_projectId: {
                projectId: workspace.id,
                userId: user.id,
              },
            },
            data: {
              userId: LEGAL_USER_ID,
            },
          });
          // disable workspace links
          await disableWorkspaceLinks(workspace.id);
        }
      } else {
        console.log(`User ${user.email} has no workspaces, skipping...`);
      }

      // delete and ban user
      await Promise.allSettled([
        prisma.user.delete({
          where: {
            id: user.id,
          },
        }),
        updateConfig({
          key: "emails",
          value: user.email!,
        }),
        log({
          message: `Banned user ${user.email} for fraudulent Stripe charges: https://dashboard.stripe.com/customers/${customerId}`,
          type: "alerts",
          mention: true,
        })
      ]);

    } else {
      console.log(`User with email ${customerEmail} not found, skipping...`);
    }
  }

  return `Processed payment_intent.payment_failed event for customer ${customerId} (${customerEmail}) and card fingerprint ${cardFingerprint})`;
}
