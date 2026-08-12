import { disableWorkspaceLinks } from "@/lib/api/workspaces/disable-workspace-links";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { cancelSubscription } from "@/lib/stripe/cancel-subscription";
import { LEGAL_USER_ID } from "@dub/utils";
import Stripe from "stripe";
import { addToStripeFraudValueLists } from "./utils/add-to-stripe-fraud-value-lists";

export async function chargeDisputeCreated(
  event: Stripe.ChargeDisputeCreatedEvent,
) {
  const dispute = event.data.object;
  const chargeId =
    typeof dispute.charge === "string" ? dispute.charge : dispute.charge.id;

  const charge = await stripe.charges.retrieve(chargeId);

  const { customer: customerId, payment_method_details } = charge;

  const workspace = await prisma.project.findUnique({
    where: {
      stripeId: customerId as string,
    },
  });

  // should never happen, but just in case
  if (!workspace) {
    return `Workspace with stripeId ${customerId} not found.`;
  }

  await disableWorkspaceLinks(workspace.id);

  const updatedUsers = await prisma.projectUsers.updateMany({
    where: {
      projectId: workspace.id,
    },
    data: {
      role: "viewer",
    },
  });

  console.log(`Updated ${updatedUsers.count} users to viewer role`);

  await prisma.projectUsers.create({
    data: {
      projectId: workspace.id,
      userId: LEGAL_USER_ID,
      role: "owner",
    },
  });
  console.log(
    `Added legal user ${LEGAL_USER_ID} as owner to workspace ${workspace.id}`,
  );

  // should always have stripeId, but just in case
  if (workspace.stripeId) {
    await cancelSubscription({
      customerId: workspace.stripeId,
      reason: "Workspace banned due to charge dispute",
    });

    const stripeCustomer = (await stripe.customers.retrieve(
      workspace.stripeId,
    )) as Stripe.Customer;

    const cardFingerprint = payment_method_details?.card?.fingerprint;

    await addToStripeFraudValueLists({
      customerId: workspace.stripeId,
      customerEmail: stripeCustomer.email,
      cardFingerprint,
    });
  }

  return `Workspace ${workspace.id} banned due to charge dispute`;
}
