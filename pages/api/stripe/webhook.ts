import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { Readable } from "node:stream";
import prisma from "@/lib/prisma";
import { PRO_TIERS } from "@/lib/stripe/constants";

// Stripe requires the raw body to construct the event.
export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable: Readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

const relevantEvents = new Set([
  "checkout.session.completed",
  "invoice.payment_failed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export default async function webhookHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // POST /api/projects/[slug]/upgrade/webhook – listen to Stripe webhooks
  if (req.method === "POST") {
    const buf = await buffer(req);
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event: Stripe.Event;
    try {
      if (!sig || !webhookSecret) return;
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } catch (err: any) {
      console.log(`❌ Error message: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (relevantEvents.has(event.type)) {
      try {
        switch (event.type) {
          case "checkout.session.completed":
            const checkoutSession = event.data
              .object as Stripe.Checkout.Session;

            // when the user subscribes to a plan, set their stripe customer ID
            // in the database for easy identification in future webhook events
            await prisma.user.update({
              where: {
                id: checkoutSession.client_reference_id,
              },
              data: {
                stripeId: checkoutSession.customer.toString(),
                billingCycleStart: new Date().getDate(),
              },
            });
            break;

          case "customer.subscription.updated":
            const subscriptionUpdated = event.data
              .object as Stripe.Subscription;
            const newPriceId = subscriptionUpdated.items.data[0].price.id;
            const env =
              process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
                ? "production"
                : "test";
            const tier = PRO_TIERS.find(
              (tier) =>
                tier.price.monthly.priceIds[env] === newPriceId ||
                tier.price.yearly.priceIds[env] === newPriceId
            );
            const usageLimit = tier.quota;

            // If a user upgrades/downgrades their subscription,
            // update their usage limit in the database.
            await prisma.user.update({
              where: {
                stripeId: subscriptionUpdated.customer.toString(),
              },
              data: {
                usageLimit,
              },
            });
            break;

          case "customer.subscription.deleted":
            const subscriptionDeleted = event.data
              .object as Stripe.Subscription;
            await prisma.user.update({
              where: {
                stripeId: subscriptionDeleted.customer.toString(),
              },
              data: {
                usageLimit: 1000,
              },
            });
            break;
          default:
            throw new Error("Unhandled relevant event!");
        }
      } catch (error) {
        console.log(error);
        return res
          .status(400)
          .send('Webhook error: "Webhook handler failed. View logs."');
      }
    } else {
      return res.status(400).send(`🤷‍♀️ Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
