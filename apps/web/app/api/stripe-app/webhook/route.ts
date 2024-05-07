import { stripe } from "@/lib/stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const POST = async (req: Request) => {
  const buf = await req.text();
  const sig = req.headers.get("Stripe-Signature") as string;

  if (!sig || !webhookSecret) return;

  try {
    const event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    console.log(event);
  } catch (error: any) {
    console.log("Stripe webhook error:", error);
  }

  return new Response("OK", {
    status: 200,
  });
};
