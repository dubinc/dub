import { claimDotLinkDomain } from "@/lib/api/domains/claim-dot-link-domain";
import { inviteUser } from "@/lib/api/users";
import { limiter } from "@/lib/cron/limiter";
import { stripe } from "@/lib/stripe";
import { WorkspaceProps } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { Invite } from "@/lib/zod/schemas/invites";
import { prisma } from "@dub/prisma";
import { User } from "@dub/prisma/client";
import { getPlanFromPriceId, log } from "@dub/utils";
import { sendEmail } from "emails";
import UpgradeEmail from "emails/upgrade-email";
import Stripe from "stripe";

export async function checkoutSessionCompleted(event: Stripe.Event) {
  const checkoutSession = event.data.object as Stripe.Checkout.Session;

  if (checkoutSession.mode === "setup") {
    return;
  }

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
  const workspaceId = checkoutSession.client_reference_id;
  const planName = plan.name.toLowerCase();

  // when the workspace subscribes to a plan, set their stripe customer ID
  // in the database for easy identification in future webhook events
  // also update the billingCycleStart to today's date

  const workspace = await prisma.project.update({
    where: {
      id: workspaceId,
    },
    data: {
      stripeId,
      billingCycleStart: new Date().getDate(),
      plan: planName,
      usageLimit: plan.limits.clicks!,
      linksLimit: plan.limits.links!,
      domainsLimit: plan.limits.domains!,
      aiLimit: plan.limits.ai!,
      tagsLimit: plan.limits.tags!,
      usersLimit: plan.limits.users!,
      salesLimit: plan.limits.sales!,
    },
    select: {
      users: {
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        where: {
          user: {
            isMachine: false,
          },
        },
      },
    },
  });

  const users = workspace.users.map(({ user }) => ({
    id: user.id,
    name: user.name,
    email: user.email,
  }));

  await Promise.allSettled([
    completeOnboarding({ users, workspaceId }),
    ...users.map((user) => {
      limiter.schedule(() =>
        sendEmail({
          email: user.email as string,
          replyTo: "steven.tey@dub.co",
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
    // update rate limits for restricted tokens for the workspace
    prisma.restrictedToken.updateMany({
      where: {
        projectId: workspaceId,
      },
      data: {
        rateLimit: plan.limits.api,
      },
    }),
    // enable dub.link premium default domain for the workspace
    prisma.defaultDomains.update({
      where: {
        projectId: workspaceId,
      },
      data: {
        dublink: true,
      },
    }),
  ]);
}

async function completeOnboarding({
  users,
  workspaceId,
}: {
  users: Pick<User, "id">[];
  workspaceId: string;
}) {
  const workspace = (await prisma.project.findUnique({
    where: {
      id: workspaceId,
    },
    include: {
      users: true,
    },
  })) as unknown as WorkspaceProps | null;

  if (!workspace) {
    console.error("Failed to complete onboarding for workspace", workspaceId);
    return;
  }

  await Promise.allSettled([
    // Complete onboarding for workspace users
    ...users.map(({ id }) => redis.set(`onboarding-step:${id}`, "completed")),

    // Send saved invite emails
    (async () => {
      const invites = await redis.get<Invite[]>(`invites:${workspaceId}`);

      if (!invites?.length) return;

      if (!workspace) return;

      await Promise.allSettled(
        invites.map(({ email, role }) =>
          inviteUser({
            email,
            role,
            workspace,
          }),
        ),
      );

      await redis.del(`invites:${workspaceId}`);
    })(),

    // Register saved domain
    (async () => {
      const data = await redis.get<{ domain: string; userId: string }>(
        `onboarding-domain:${workspaceId}`,
      );
      if (!data || !data.domain || !data.userId) return;
      const { domain, userId } = data;

      try {
        await claimDotLinkDomain({
          domain,
          userId,
          workspace,
        });
        await redis.del(`onboarding-domain:${workspaceId}`);
      } catch (e) {
        console.error(
          "Failed to register saved domain from onboarding",
          { domain, userId, workspace },
          e,
        );
      }
    })(),
  ]);
}
