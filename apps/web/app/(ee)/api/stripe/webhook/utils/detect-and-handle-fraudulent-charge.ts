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

export async function detectAndHandleFraudulentCharge(
  event: Stripe.ChargeFailedEvent | Stripe.ChargeDisputeCreatedEvent,
) {
  let charge: Stripe.Charge;

  if (event.type === "charge.dispute.created") {
    const dispute = event.data.object;
    const chargeId =
      typeof dispute.charge === "string" ? dispute.charge : dispute.charge.id;
    charge = await stripe.charges.retrieve(chargeId);
  } else {
    charge = event.data.object;
  }

  const { customer, outcome, payment_method_details } = charge;

  // should never happen, but just in case
  if (!customer || !outcome || !payment_method_details) {
    return `[detectAndHandleFraudulentCharge]: Invalid charge attributes: ${JSON.stringify({ customer, outcome })}`;
  }

  const customerId = customer as string;

  const workspace = await prisma.project.findUnique({
    where: {
      stripeId: customerId,
    },
  });

  if (workspace) {
    return `[detectAndHandleFraudulentCharge]: Workspace with stripeId ${customer} already created, so this is most likely a failed subscription renewal payment, skipping...`;
  }

  const { risk_level } = outcome;

  if (risk_level !== "highest") {
    return `[detectAndHandleFraudulentCharge]: Risk level "${risk_level}" is not highest, skipping...`;
  }

  const stripeCustomer = (await stripe.customers.retrieve(
    customerId,
  )) as Stripe.Customer;

  const cardFingerprint = payment_method_details.card?.fingerprint;

  // add to Stripe Fraud Value Lists
  await Promise.allSettled([
    stripe.radar.valueListItems.create({
      value_list: STRIPE_FRAUD_VALUE_LISTS.CUSTOMER_ID,
      value: customerId,
    }),
    stripeCustomer.email
      ? stripe.radar.valueListItems.create({
          value_list: STRIPE_FRAUD_VALUE_LISTS.CUSTOMER_EMAIL,
          value: stripeCustomer.email!,
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
        const listItem = [customerId, stripeCustomer.email, cardFingerprint][
          idx
        ];
        const listName = Object.entries(STRIPE_FRAUD_VALUE_LISTS)[idx][0];
        console.log(
          `Added ${listItem} to ${listName} Fraud Value List: ${JSON.stringify(result.value, null, 2)}`,
        );
      }
    });
  });

  if (stripeCustomer.email) {
    const user = await prisma.user.findUnique({
      where: {
        email: stripeCustomer.email,
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
      let paidWorkspaces = 0;
      if (workspaces.length > 0) {
        for (const workspace of workspaces) {
          // this should never happen, but just in case
          if (workspace.plan !== "free") {
            paidWorkspaces++;
            await log({
              type: "errors",
              message: `[detectAndHandleFraudulentCharge]: Workspace ${workspace.slug} for fraudulent user ${user.email} is not a free plan, skipping...`,
            });
            continue;
          }
          const linksCount = await prisma.link.count({
            where: {
              projectId: workspace.id,
            },
          });
          if (linksCount > 0) {
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
            console.log(
              `[detectAndHandleFraudulentCharge]: Transferred ownership of workspace ${workspace.slug} to legal user ${LEGAL_USER_ID}`,
            );
            // disable workspace links
            await disableWorkspaceLinks(workspace.id);
          } else {
            // if workspace has no links, just delete it
            await prisma.project.delete({
              where: {
                id: workspace.id,
              },
            });
            console.log(
              `[detectAndHandleFraudulentCharge]: Deleted workspace ${workspace.slug} because it has no links`,
            );
          }
        }
      } else {
        console.log(
          `[detectAndHandleFraudulentCharge]: User ${user.email} has no workspaces, skipping...`,
        );
      }

      // delete and ban user if there are no paid workspaces
      if (paidWorkspaces === 0) {
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
        ]);
      }

      await log({
        message: `Banned user ${user.email} (workspace: ${workspaces.map(({ slug }) => slug).join(", ")}) for fraudulent Stripe charges: https://dashboard.stripe.com/customers/${customerId}`,
        type: "alerts",
        mention: true,
      });
    } else {
      console.log(
        `[detectAndHandleFraudulentCharge]: User with email ${stripeCustomer.email} not found, skipping...`,
      );
    }
  }

  return `[detectAndHandleFraudulentCharge]: Processed ${event.type} event for customer ${customerId} (${stripeCustomer.email}) and card fingerprint "${cardFingerprint}".`;
}
