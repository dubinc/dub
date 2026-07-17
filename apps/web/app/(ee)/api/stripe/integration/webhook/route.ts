import { captureWebhookLog } from "@/lib/api-logs/capture-webhook-log";
import { withAxiom } from "@/lib/axiom/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { StripeMode } from "@/lib/types";
import { waitUntil } from "@vercel/functions";
import { logAndRespond } from "app/(ee)/api/cron/utils";
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
import { WebhookHandlerResponse } from "./types";

export const dynamic = "force-dynamic";

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
    return logAndRespond("Invalid request", {
      status: 400,
    });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err: any) {
    return logAndRespond(`Webhook Error: ${err.message}`, {
      status: 400,
    });
  }

  console.log("Webhook event", {
    eventId: event.id,
    eventType: event.type,
    accountId: event.account,
    mode,
  });

  // Ignore unsupported events
  if (!relevantEvents.has(event.type)) {
    return logAndRespond({
      eventType: event.type,
      response: "Unsupported event, skipping...",
    });
  }

  // When an app is installed in both live & test mode,
  // test mode events are sent to both the test mode and live mode endpoints,
  // and live mode events are sent to the live mode endpoint.
  // See: https://docs.stripe.com/stripe-apps/build-backend#event-behavior-depends-on-install-mode
  if (!event.livemode && mode === "live") {
    return logAndRespond({
      eventType: event.type,
      response:
        "Received a test webhook event on our live webhook receiver endpoint, skipping...",
    });
  }

  // Should never happen, but just in case
  if (!event.account) {
    return logAndRespond({
      eventType: event.type,
      response: "Missing Stripe Connect account on event, skipping...",
    });
  }

  // Find the workspace
  const workspace = await prisma.project.findUnique({
    where: {
      stripeConnectId: event.account,
    },
    select: {
      id: true,
      stripeConnectId: true,
      defaultProgramId: true,
      webhookEnabled: true,
    },
  });

  if (!workspace) {
    return logAndRespond({
      eventType: event.type,
      response: `Workspace not found for Stripe account ${event.account}, skipping...`,
    });
  }

  let result: WebhookHandlerResponse = {
    response: "OK",
  };

  switch (event.type) {
    case "account.application.deauthorized":
      result = await accountApplicationDeauthorized({
        event,
        mode,
        workspace,
      });
      break;
    case "charge.refunded":
      result = await chargeRefunded({
        event,
        mode,
        workspace,
      });
      break;
    case "checkout.session.completed":
      result = await checkoutSessionCompleted({
        event,
        mode,
        workspace,
      });
      break;
    case "coupon.deleted":
      result = await couponDeleted({
        event,
        workspace,
      });
      break;
    case "customer.created":
      result = await customerCreated({
        event,
        workspace,
      });
      break;
    case "customer.updated":
      result = await customerUpdated({
        event,
        workspace,
      });
      break;
    case "customer.subscription.created":
      result = await customerSubscriptionCreated({
        event,
        mode,
        workspace,
      });
      break;
    case "customer.subscription.deleted":
      result = await customerSubscriptionDeleted(event);
      break;
    case "invoice.paid":
      result = await invoicePaid({
        event,
        mode,
        workspace,
      });
      break;
    case "promotion_code.updated":
      result = await promotionCodeUpdated({
        event,
        workspace,
      });
      break;
  }

  const responseBody = {
    eventType: event.type,
    response: result.response,
  };

  // If the event is not from the workspace's Stripe Connect account, skip logging
  if (event.account !== workspace.stripeConnectId) {
    return logAndRespond(responseBody);
  }

  waitUntil(
    captureWebhookLog({
      workspaceId: workspace.id,
      method: req.method,
      path: "/stripe/integration/webhook",
      statusCode: 200,
      duration: Date.now() - startTime,
      requestBody: event,
      responseBody,
      userAgent: req.headers.get("user-agent"),
    }),
  );

  return logAndRespond(responseBody);
});
