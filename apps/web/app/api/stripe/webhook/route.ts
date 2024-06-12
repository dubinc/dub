import { limiter } from "@/lib/cron/limiter";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { redis } from "@/lib/upstash";
import { FREE_PLAN, getPlanFromPriceId, log } from "@dub/utils";
import { sendEmail } from "emails";
import UpgradeEmail from "emails/upgrade-email";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const relevantEvents = new Set([
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

// POST /api/stripe/webhook – listen to Stripe webhooks
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
            type: "errors",
          });
          return;
        }

        const subscription = await stripe.subscriptions.retrieve(
          checkoutSession.subscription as string,
        );
        const priceId = subscription.items.data[0].price.id;

        const plan = getPlanFromPriceId(priceId);

        if (!plan) {
          await log({
            message: `Invalid price ID in checkout.session.completed event: ${priceId}`,
            type: "errors",
          });
          return;
        }

        const stripeId = checkoutSession.customer.toString();

        // when the workspace subscribes to a plan, set their stripe customer ID
        // in the database for easy identification in future webhook events
        // also update the billingCycleStart to today's date

        const workspace = await prisma.project.update({
          where: {
            id: checkoutSession.client_reference_id,
          },
          data: {
            stripeId,
            billingCycleStart: new Date().getDate(),
            plan: plan.name.toLowerCase(),
            usageLimit: plan.limits.clicks!,
            linksLimit: plan.limits.links!,
            domainsLimit: plan.limits.domains!,
            aiLimit: plan.limits.ai!,
            tagsLimit: plan.limits.tags!,
            usersLimit: plan.limits.users!,
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

        const users = workspace.users.map(({ user }) => ({
          name: user.name,
          email: user.email,
        }));

        await Promise.allSettled(
          users.map((user) => {
            limiter.schedule(() =>
              sendEmail({
                email: user.email as string,
                subject: `Thank you for upgrading to Dub.co ${plan.name}!`,
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

        const plan = getPlanFromPriceId(priceId);

        if (!plan) {
          await log({
            message: `Invalid price ID in customer.subscription.updated event: ${priceId}`,
            type: "errors",
          });
          return;
        }

        const stripeId = subscriptionUpdated.customer.toString();

        const workspace = await prisma.project.findUnique({
          where: {
            stripeId,
          },
        });

        if (!workspace) {
          await log({
            message:
              "Workspace with Stripe ID *`" +
              stripeId +
              "`* not found in Stripe webhook `customer.subscription.updated` callback",
            type: "errors",
          });
          return NextResponse.json({ received: true });
        }

        const newPlan = plan.name.toLowerCase();

        // If a workspace upgrades/downgrades their subscription, update their usage limit in the database.
        if (workspace.plan !== newPlan) {
          await prisma.project.update({
            where: {
              stripeId,
            },
            data: {
              plan: newPlan,
              usageLimit: plan.limits.clicks!,
              linksLimit: plan.limits.links!,
              domainsLimit: plan.limits.domains!,
              aiLimit: plan.limits.ai!,
              tagsLimit: plan.limits.tags!,
              usersLimit: plan.limits.users!,
            },
          });
        }
      }

      // If workspace cancels their subscription
      if (event.type === "customer.subscription.deleted") {
        const subscriptionDeleted = event.data.object as Stripe.Subscription;

        const stripeId = subscriptionDeleted.customer.toString();

        // If a workspace deletes their subscription, reset their usage limit in the database to 1000.
        // Also remove the root domain redirect for all their domains from Redis.
        const workspace = await prisma.project.findUnique({
          where: {
            stripeId,
          },
          select: {
            id: true,
            slug: true,
            domains: true,
            users: {
              select: {
                user: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
        });

        if (!workspace) {
          await log({
            message:
              "Workspace with Stripe ID *`" +
              stripeId +
              "`* not found in Stripe webhook `customer.subscription.deleted` callback",
            type: "errors",
          });
          return NextResponse.json({ received: true });
        }

        const workspaceUsers = workspace.users.map(
          ({ user }) => user.email as string,
        );

        const pipeline = redis.pipeline();
        // remove root domain redirect for all domains
        workspace.domains.forEach((domain) => {
          pipeline.hset(domain.slug.toLowerCase(), {
            _root: {
              id: domain.id,
              projectId: workspace.id,
            },
          });
        });

        await Promise.allSettled([
          prisma.project.update({
            where: {
              stripeId,
            },
            data: {
              plan: "free",
              usageLimit: FREE_PLAN.limits.clicks!,
              linksLimit: FREE_PLAN.limits.links!,
              domainsLimit: FREE_PLAN.limits.domains!,
              aiLimit: FREE_PLAN.limits.ai!,
              tagsLimit: FREE_PLAN.limits.tags!,
              usersLimit: FREE_PLAN.limits.users!,
            },
          }),
          pipeline.exec(),
          log({
            message:
              ":cry: Workspace *`" +
              workspace.slug +
              "`* deleted their subscription",
            type: "cron",
            mention: true,
          }),
          workspaceUsers.map((email) =>
            sendEmail({
              email,
              from: "steven@dub.co",
              subject: "Feedback on your Dub.co experience?",
              text: "Hey!\n\nI noticed you recently cancelled your Dub.co subscription – we're sorry to see you go!\n\nI'd love to hear your feedback on your experience with Dub – what could we have done better?\n\nThanks!\n\nSteven Tey\nFounder, Dub.co",
            }),
          ),
          workspace.domains.forEach((domain) => {
            // TODO:
            // We may want to update Redis as well

            prisma.link.update({
              where: {
                id: domain.id,
              },
              data: {
                url: "",
                noindex: false,
              },
            });
          }),
        ]);
      }
    } catch (error) {
      await log({
        message: `Stripe webhook failed. Error: ${error.message}`,
        type: "errors",
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
