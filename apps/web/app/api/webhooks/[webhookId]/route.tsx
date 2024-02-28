import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

const SUPPORTED_STRIPE_EVENTS = ["customer.created", "charge.succeeded"];

// POST /api/webhooks/[webhookId]
export async function POST(
  request: Request,
  { params }: { params: { webhookId: string } }
) {
  const webhook = await prisma.webhook.findOne({
    where: {
      id: params.webhookId,
    },
    include: {
      project: true,
    },
  });
  if (!webhook) {
    return new Response("Dub webhook endpoint not found", { status: 404 });
  }
 
  const payload = await request.json();
  if (!SUPPORTED_STRIPE_EVENTS.includes(payload.type)) {
    return new Response("Unsupported event type", { status: 400 });
  }

  const event = stripe.webhooks.constructEvent(
    payload,
    request.headers.get("stripe-signature") as string,
    webhook.webhookSecret
  );
  if (event.type !== payload.type) {
    return new Response("Event type mismatch", { status: 400 });
  }

  switch (event.type) {
    case "customer.created":
      handleCustomerCreated(event.data.object);
      break;
    case "charge.succeeded":
      handleChargeSucceeded(event.data.object);
      break;
  }
};

// This event will check the metadata of the customer to see if they have a Dub id.
// If it does, we will look up the information and append more metadata to the customer.
const handleCustomerCreated = (customer: any) => {
  console.log("New customer created", customer);
}

// This event will check the customer of the charge to see if they have a Dub id.
// If it does, we will look up the information and append metadata to the charge.
const handleChargeSucceeded = (charge: any) => {
  console.log("Charge succeeded", charge);
}