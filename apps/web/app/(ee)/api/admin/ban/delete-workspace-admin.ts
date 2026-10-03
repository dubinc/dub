import { linkCache } from "@/lib/api/links/cache";
import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { stripe } from "@/lib/stripe";
import { cancelSubscription } from "@/lib/stripe/cancel-subscription";
import { WorkspaceProps } from "@/lib/types";
import {
  APP_DOMAIN_WITH_NGROK,
  DUB_DOMAINS_ARRAY,
  LEGAL_USER_ID,
  LEGAL_WORKSPACE_ID,
  R2_URL,
} from "@dub/utils";
import { addToStripeFraudValueLists } from "app/(ee)/api/stripe/webhook/utils/add-to-stripe-fraud-value-lists";
import Stripe from "stripe";

export async function deleteWorkspaceAdmin(
  workspace: Pick<WorkspaceProps, "id" | "slug" | "logo" | "stripeId">,
) {
  while (true) {
    const defaultDomainLinks = await prisma.link.findMany({
      where: {
        projectId: workspace.id,
        domain: {
          in: DUB_DOMAINS_ARRAY,
        },
      },
      select: {
        id: true,
        domain: true,
        key: true,
      },
      take: 100,
    });

    if (defaultDomainLinks.length === 0) {
      break;
    }

    const [redisRes, prismaRes] = await Promise.allSettled([
      linkCache.expireMany(defaultDomainLinks),
      prisma.link.updateMany({
        where: {
          id: {
            in: defaultDomainLinks.map((link) => link.id),
          },
        },
        data: {
          projectId: LEGAL_WORKSPACE_ID,
          userId: LEGAL_USER_ID,
        },
      }),
    ]);

    console.log(
      `Banned ${defaultDomainLinks.length} default domain links for ${workspace.slug}`,
      redisRes,
      prismaRes,
    );
  }

  const deleteWorkspaceResponse = await Promise.allSettled([
    // delete workspace logo if it's a custom logo stored in R2
    workspace.logo &&
      workspace.logo.startsWith(`${R2_URL}/logos/${workspace.id}`) &&
      storage.delete({ key: workspace.logo.replace(`${R2_URL}/`, "") }),

    // if they have a Stripe subscription, cancel it + add to fraud value lists
    workspace.stripeId &&
      cancelSubscription({
        customerId: workspace.stripeId,
        immediateCancellation: true,
        reason: "Customer was banned from Dub",
      }).then(async (res) => {
        console.log("Cancelled Stripe subscription", res);

        const stripeCustomer = (await stripe.customers.retrieve(
          workspace.stripeId!,
          {
            expand: ["invoice_settings.default_payment_method"],
          },
        )) as Stripe.Customer;

        const defaultPaymentMethod =
          stripeCustomer.invoice_settings?.default_payment_method;

        await addToStripeFraudValueLists({
          customerId: workspace.stripeId!,
          customerEmail: stripeCustomer.email,
          cardFingerprint:
            defaultPaymentMethod && typeof defaultPaymentMethod !== "string"
              ? defaultPaymentMethod.card?.fingerprint
              : undefined,
        });
      }),

    // Queue the workspace for deletion
    qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/workspaces/delete`,
      body: {
        workspaceId: workspace.id,
      },
    }),
  ]);

  console.log(`Deleted workspace ${workspace.slug}`, deleteWorkspaceResponse);

  return {
    deleteWorkspaceResponse,
  };
}
