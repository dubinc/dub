import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getPlanAndTierFromPriceId, log } from "@dub/utils";
import Stripe from "stripe";

export async function customerSubscriptionTrialWillEnd(
  event: Stripe.CustomerSubscriptionTrialWillEndEvent,
) {
  const subscription = event.data.object;

  if (subscription.status !== "trialing") {
    return `Subscription ${subscription.id} is not trialing, skipping...`;
  }

  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) {
    return `Subscription ${subscription.id} has no price, skipping...`;
  }

  const { plan } = getPlanAndTierFromPriceId({ priceId });
  if (!plan) {
    return `Invalid price ID in trial_will_end event: ${priceId}, skipping...`;
  }

  const stripeId = subscription.customer.toString();

  const workspace = await prisma.project.findUnique({
    where: { stripeId },
    select: { slug: true },
  });

  if (!workspace) {
    return `Workspace with Stripe ID ${stripeId} not found, skipping...`;
  }

  const customer = await stripe.customers.retrieve(stripeId);
  const paymentMethodId = getPaymentMethodId(subscription, customer);

  if (!paymentMethodId) {
    const skipMessage = await cancelTrialingSubscription({
      subscriptionId: subscription.id,
      comment: "Trial ended without a payment method on file.",
    });
    if (skipMessage) {
      return skipMessage;
    }

    await log({
      message: `Canceled trialing subscription ${subscription.id} for workspace ${workspace.slug} (missing payment method).`,
      type: "cron",
    });

    return `Canceled subscription ${subscription.id} for workspace ${workspace.slug} due to missing payment method.`;
  }

  try {
    const upcomingInvoice = await stripe.invoices.createPreview({
      customer: stripeId,
      subscription: subscription.id,
    });

    const { amount_due: amount, currency } = upcomingInvoice;

    if (!amount || amount <= 0) {
      return `Subscription ${subscription.id} has no amount due on upcoming invoice, skipping validation.`;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: stripeId,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: true,
      capture_method: "manual",
    });

    if (paymentIntent.status === "requires_capture") {
      await stripe.paymentIntents.cancel(paymentIntent.id);
      return `Validated payment method for subscription ${subscription.id} (workspace ${workspace.slug}).`;
    }

    const skipMessage = await cancelTrialingSubscription({
      subscriptionId: subscription.id,
      comment: `Trial payment validation returned status: ${paymentIntent.status}`,
    });
    if (skipMessage) {
      return skipMessage;
    }

    return `Canceled subscription ${subscription.id} due to unexpected payment validation status (${paymentIntent.status}).`;
  } catch (error) {
    if (error instanceof Stripe.errors.StripeCardError) {
      const skipMessage = await cancelTrialingSubscription({
        subscriptionId: subscription.id,
        comment: `Trial payment validation failed: ${error.message}`,
      });
      if (skipMessage) {
        return skipMessage;
      }

      await log({
        message: `Canceled trialing subscription ${subscription.id} for workspace ${workspace.slug} after failed payment validation (${error.decline_code ?? error.code}).`,
        type: "cron",
        mention: true,
      });

      return `Canceled subscription ${subscription.id} for workspace ${workspace.slug} due to failed payment validation.`;
    }

    throw error;
  }
}

function getPaymentMethodId(
  subscription: Stripe.Subscription,
  customer: Stripe.Customer | Stripe.DeletedCustomer,
): string | null {
  if (subscription.default_payment_method) {
    return typeof subscription.default_payment_method === "string"
      ? subscription.default_payment_method
      : subscription.default_payment_method.id;
  }

  if (customer.deleted) {
    return null;
  }

  const defaultPaymentMethod =
    customer.invoice_settings?.default_payment_method;
  if (!defaultPaymentMethod) {
    return null;
  }

  return typeof defaultPaymentMethod === "string"
    ? defaultPaymentMethod
    : defaultPaymentMethod.id;
}

async function cancelTrialingSubscription({
  subscriptionId,
  comment,
}: {
  subscriptionId: string;
  comment: string;
}) {
  const current = await stripe.subscriptions.retrieve(subscriptionId);
  if (current.status !== "trialing") {
    return `Subscription ${subscriptionId} is no longer trialing, skipping cancel.`;
  }

  await stripe.subscriptions.cancel(subscriptionId, {
    cancellation_details: { comment },
  });

  return null;
}
