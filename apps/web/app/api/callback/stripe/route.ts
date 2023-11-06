import { limiter } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getPlanFromPriceId, isNewCustomer } from "@/lib/stripe/utils";
import { redis } from "@/lib/upstash";
import { log } from "@dub/utils";
import { sendEmail } from "emails";
import UpgradeEmail from "emails/upgrade-email";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const relevantEvents = new Set([
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

// POST /api/callback/stripe – listen to Stripe webhooks
export const POST = async (req: Request) => {
  const buf = await req.text();
  const sig = req.headers.get("Stripe-Signature") as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;
  try {
    if (!sig || !webhookSecret) return;
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err: any) {
    console.log(`❌ Error message: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, {
      status: 400,
    });
  }
  if (relevantEvents.has(event.type)) {
    try {
      if (event.type === "checkout.session.completed") {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;

        if (
          checkoutSession.client_reference_id === null ||
          checkoutSession.customer === null
        ) {
          await log({
            message: "Missing items in Stripe webhook callback",
            type: "cron",
            mention: true,
          });
          return;
        }

        const stripeId = checkoutSession.customer.toString();
        const subscription = await stripe.subscriptions.retrieve(
          checkoutSession.subscription as string,
        );
        const plan = getPlanFromPriceId(subscription.items.data[0].price.id);
        const usageLimit = plan.quota;

        // when the project subscribes to a plan, set their stripe customer ID
        // in the database for easy identification in future webhook events
        // also update the billingCycleStart to today's date

        const project = await prisma.project.update({
          where: {
            id: checkoutSession.client_reference_id,
          },
          data: {
            stripeId,
            billingCycleStart: new Date().getDate(),
            usageLimit,
            plan: plan.slug,
          },
          select: {
            users: {
              select: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        });

        const users = project.users.map(({ user }) => ({
          name: user.name,
          email: user.email,
        }));

        await Promise.allSettled(
          users.map((user) => {
            limiter.schedule(() =>
              sendEmail({
                email: user.email as string,
                subject: `Thank you for upgrading to Dub ${plan.name}!`,
                react: UpgradeEmail({
                  name: user.name,
                  email: user.email as string,
                  plan: plan.name,
                }),
                marketing: true,
              }),
            );
          }),
        );
      }

      // for subscription updates
      if (event.type === "customer.subscription.updated") {
        const subscriptionUpdated = event.data.object as Stripe.Subscription;
        const priceId = subscriptionUpdated.items.data[0].price.id;
        const newCustomer = isNewCustomer(event.data.previous_attributes);

        const plan = getPlanFromPriceId(priceId);
        const usageLimit = plan.quota;
        const stripeId = subscriptionUpdated.customer.toString();

        const project = await prisma.project.findUnique({
          where: {
            stripeId,
          },
        });

        if (!project) {
          await log({
            message:
              "Project not found in Stripe webhook `customer.subscription.updated` callback",
            type: "cron",
            mention: true,
          });
          return;
        }

        // If a project upgrades/downgrades their subscription, update their usage limit in the database.
        const updatedProject = await prisma.project.update({
          where: {
            stripeId,
          },
          data: {
            usageLimit,
            plan: plan.slug,
          },
          select: {
            users: {
              select: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        });

        if (newCustomer) {
          const users = updatedProject.users.map(({ user }) => ({
            name: user.name,
            email: user.email,
          }));

          await Promise.allSettled(
            users.map((user) => {
              limiter.schedule(() =>
                sendEmail({
                  email: user.email as string,
                  subject: `Thank you for upgrading to Dub ${plan.name}!`,
                  react: UpgradeEmail({
                    name: user.name,
                    email: user.email as string,
                    plan: plan.name,
                  }),
                  marketing: true,
                }),
              );
            }),
          );
        }
      }

      // If project cancels their subscription
      if (event.type === "customer.subscription.deleted") {
        const subscriptionDeleted = event.data.object as Stripe.Subscription;

        const stripeId = subscriptionDeleted.customer.toString();

        // If a project deletes their subscription, reset their usage limit in the database to 1000.
        // Also remove the root domain redirect for all their domains from Redis.
        const project = await prisma.project.findUnique({
          where: {
            stripeId,
          },
          select: {
            name: true,
            domains: true,
          },
        });

        if (!project) {
          await log({
            message:
              "Project not found in Stripe webhook `customer.subscription.deleted` callback",
            type: "cron",
            mention: true,
          });
          return;
        }

        const projectDomains = project.domains.map((domain) => domain.slug);

        const pipeline = redis.pipeline();
        // remove root domain redirect for all domains
        projectDomains.forEach((domain) => {
          pipeline.del(`root:${domain}`);
        });

        await Promise.all([
          prisma.project.update({
            where: {
              stripeId,
            },
            data: {
              usageLimit: 1000,
              plan: "free",
            },
          }),
          pipeline.exec(),
          log({
            message:
              ":cry: Project *`" +
              project.name +
              "`* deleted their subscription",
            type: "cron",
            mention: true,
          }),
        ]);
      }
    } catch (error) {
      await log({
        message: `Stripe webook failed. Error: ${error.message}`,
        type: "cron",
        mention: true,
      });
      return new Response(
        'Webhook error: "Webhook handler failed. View logs."',
        {
          status: 400,
        },
      );
    }
  } else {
    return new Response(`🤷‍♀️ Unhandled event type: ${event.type}`, {
      status: 400,
    });
  }

  return NextResponse.json({ received: true });
};
