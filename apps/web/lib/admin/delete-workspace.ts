import { qstash } from "@/lib/cron";
import { stripe } from "@/lib/stripe";
import { cancelSubscription } from "@/lib/stripe/cancel-subscription";
import {
  APP_DOMAIN_WITH_NGROK,
  DUB_DOMAINS_ARRAY,
  LEGAL_USER_ID,
  LEGAL_WORKSPACE_ID,
  pluck,
} from "@dub/utils";
import { deleteProgramAdmin } from "app/(ee)/api/admin/programs/delete/delete-program-admin";
import { addToStripeFraudValueLists } from "app/(ee)/api/stripe/webhook/utils/add-to-stripe-fraud-value-lists";
import Stripe from "stripe";
import { linkCache } from "../api/links/cache";
import { prisma } from "../prisma";
import { WorkspaceProps } from "../types";

export async function deleteWorkspace(
  workspace: Pick<
    WorkspaceProps,
    "id" | "slug" | "stripeId" | "defaultProgramId"
  >,
) {
  await banWorkspaceDefaultDomainLinks(workspace);

  await Promise.allSettled([
    // If they have a Stripe subscription, cancel it + add to fraud value lists
    workspace.stripeId && cancelBannedSubscription(workspace.stripeId),

    workspace.defaultProgramId &&
      deleteProgramAdmin(workspace.defaultProgramId),
  ]);

  console.log(`Deleted workspace ${workspace.slug}`);

  // Queue the workspace for deletion
  await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/workspaces/delete`,
    body: {
      workspaceId: workspace.id,
    },
  });
}

async function banWorkspaceDefaultDomainLinks(
  workspace: Pick<WorkspaceProps, "id" | "slug">,
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

    await Promise.all([
      prisma.link.updateMany({
        where: {
          id: {
            in: pluck(defaultDomainLinks, "id"),
          },
        },
        data: {
          projectId: LEGAL_WORKSPACE_ID,
          userId: LEGAL_USER_ID,
        },
      }),

      linkCache.expireMany(defaultDomainLinks),
    ]);
  }
}

async function cancelBannedSubscription(stripeId: string) {
  await cancelSubscription({
    customerId: stripeId,
    immediateCancellation: true,
    reason: "Customer was banned from Dub",
  });

  const stripeCustomer = (await stripe.customers.retrieve(stripeId, {
    expand: ["invoice_settings.default_payment_method"],
  })) as Stripe.Customer;

  const defaultPaymentMethod =
    stripeCustomer.invoice_settings?.default_payment_method;

  await addToStripeFraudValueLists({
    customerId: stripeId,
    customerEmail: stripeCustomer.email,
    cardFingerprint:
      defaultPaymentMethod && typeof defaultPaymentMethod !== "string"
        ? defaultPaymentMethod.card?.fingerprint
        : undefined,
  });
}
