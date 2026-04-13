import { captureWebhookLog } from "@/lib/api-logs/capture-webhook-log";
import { withAxiom } from "@/lib/axiom/server";
import { stripe } from "@/lib/stripe";
import { StripeMode } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { accountApplicationDeauthorized } from "./account-application-deauthorized";
import { chargeRefunded } from "./charge-refunded";
import { checkoutSessionCompleted } from "./checkout-session-completed";
import { couponDeleted } from "./coupon-deleted";
import { customerCreated } from "./customer-created";
import { customerSubscriptionCreated } from "./customer-subscription-created";
import { customerSubscriptionDeleted } from "./customer-subscription-deleted";
import { customerUpdated } from "./customer-updated";
import { invoicePaid } from "./invoice-paid";
import { promotionCodeUpdated } from "./promotion-code-updated";

const relevantEvents = new Set([
  "account.application.deauthorized",
  "charge.refunded",
  "checkout.session.completed",
  "coupon.deleted",
  "customer.created",
  "customer.updated",
  "customer.subscription.created",
  "customer.subscription.deleted",
  "invoice.paid",
  "promotion_code.updated",
]);

// POST /api/stripe/integration/webhook – listen to Stripe webhooks (for Stripe Integration)
export const POST = withAxiom(async (req: Request) => {
  const startTime = Date.now();
  const pathname = new URL(req.url).pathname;
  const buf = await req.text();
  const sig = req.headers.get("Stripe-Signature");

  // @see https://github.com/dubinc/dub/blob/main/apps/web/app/(ee)/api/stripe/integration/webhook/test/route.ts
  let webhookSecret: string | undefined;
  let mode: StripeMode;

  if (pathname.endsWith("/test")) {
    webhookSecret = process.env.STRIPE_APP_WEBHOOK_SECRET_TEST;
    mode = "test";
  } else if (pathname.endsWith("/sandbox")) {
    webhookSecret = process.env.STRIPE_APP_WEBHOOK_SECRET_SANDBOX;
    mode = "sandbox";
  } else {
    webhookSecret = process.env.STRIPE_APP_WEBHOOK_SECRET;
    mode = "live";
  }

  if (!sig || !webhookSecret) {
    return new Response("Invalid request", {
      status: 400,
    });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err: any) {
    console.log(`❌ Error message: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, {
      status: 400,
    });
  }

  // Ignore unsupported events
  if (!relevantEvents.has(event.type)) {
    return new Response("Unsupported event, skipping...", {
      status: 200,
    });
  }

  // When an app is installed in both live & test mode,
  // test mode events are sent to both the test mode and live mode endpoints,
  // and live mode events are sent to the live mode endpoint.
  // See: https://docs.stripe.com/stripe-apps/build-backend#event-behavior-depends-on-install-mode
  if (!event.livemode && mode === "live") {
    const response =
      "Received a test webhook event on our live webhook receiver endpoint, skipping...";
    console.log(`[${event.type}]: ${response}`);
    return NextResponse.json({
      eventType: event.type,
      response,
    });
  }

  let result: {
    response: string;
    workspaceId?: string;
  } = {
    response: "OK",
  };

  switch (event.type) {
    case "account.application.deauthorized":
      result = await accountApplicationDeauthorized(event, mode);
      break;
    case "charge.refunded":
      result = await chargeRefunded(event, mode);
      break;
    case "checkout.session.completed":
      result = await checkoutSessionCompleted(event, mode);
      break;
    case "coupon.deleted":
      result = await couponDeleted(event);
      break;
    case "customer.created":
      result = await customerCreated(event);
      break;
    case "customer.updated":
      result = await customerUpdated(event);
      break;
    case "customer.subscription.created":
      result = await customerSubscriptionCreated(event, mode);
      break;
    case "customer.subscription.deleted":
      result = await customerSubscriptionDeleted(event);
      break;
    case "invoice.paid":
      result = await invoicePaid(event, mode);
      break;
    case "promotion_code.updated":
      result = await promotionCodeUpdated(event);
      break;
  }

  const responseBody = {
    eventType: event.type,
    response: result.response,
  };

  waitUntil(
    (async () => {
      // if workspaceId is returned as undefined
      // AND the response does not contain "Workspace not found" (indicating the workspace doesn't exist)
      // we try to find the workspace ID from the Stripe account ID
      if (
        !result.workspaceId &&
        !result.response.startsWith("Workspace not found") &&
        event.account
      ) {
        const workspace = await prisma.project.findUnique({
          where: {
            stripeConnectId: event.account,
          },
          select: {
            id: true,
          },
        });
        if (workspace) {
          // if workspace exists, we set the workspace ID
          result.workspaceId = workspace.id;
        }
      }

      // if workspace ID exists, we capture the webhook log
      if (result.workspaceId) {
        await captureWebhookLog({
          workspaceId: result.workspaceId,
          method: req.method,
          path: "/stripe/integration/webhook",
          statusCode: 200,
          duration: Date.now() - startTime,
          requestBody: event,
          responseBody,
          userAgent: req.headers.get("user-agent"),
        });
      }
    })(),
  );

  console.log(`[${event.type}]: ${result.response}`);

  return NextResponse.json(responseBody);
});
