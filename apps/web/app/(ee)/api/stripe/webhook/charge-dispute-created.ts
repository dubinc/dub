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

  const charge = await stripe.charges.retrieve(chargeId, {
    expand: ["customer"],
  });

  const { customer: customerObj, payment_method_details } = charge;
  const customer = customerObj as Stripe.Customer;

  const workspace = await prisma.project.findUnique({
    where: {
      stripeId: customer.id,
    },
  });

  // should never happen, but just in case
  if (!workspace) {
    return `Workspace with stripeId ${customer.id} not found.`;
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

  await addToStripeFraudValueLists({
    customerId: customer.id,
    customerEmail: customer.email,
    cardFingerprint: payment_method_details?.card?.fingerprint,
  });

  await cancelSubscription({
    customerId: customer.id,
    reason: "Workspace banned due to charge dispute",
  });

  return `Workspace ${workspace.id} banned due to charge dispute`;
}
