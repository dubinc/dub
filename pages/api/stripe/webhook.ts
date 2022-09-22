import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { Readable } from "node:stream";
import prisma from "@/lib/prisma";

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
  "invoice.paid",
  "invoice.payment_failed",
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

            await prisma.project.update({
              where: {
                slug: checkoutSession.client_reference_id,
              },
              data: {
                plan: "pro",
                usageLimit: 1000000,
                stripeId: checkoutSession.customer.toString(),
                lastBilled: new Date(),
              },
            });
            break;
          case "invoice.paid":
            const invoicePaid = event.data.object as Stripe.Invoice;
            console.log("invoice paid", invoicePaid);
            await prisma.project.update({
              where: {
                stripeId: invoicePaid.customer.toString(),
              },
              data: {
                lastBilled: new Date(),
              },
            });
            break;
          case "invoice.payment_failed":
            const invoiceFailed = event.data.object as Stripe.Invoice;
            console.log("invoice failed", invoiceFailed);
            // TODO - send email to user
            break;
          case "customer.subscription.deleted":
            const subscription = event.data.object as Stripe.Subscription;
            console.log("subscription deleted", subscription);
            await prisma.project.update({
              where: {
                stripeId: subscription.customer.toString(),
              },
              data: {
                plan: "free",
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
