import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { Program, Project } from "@prisma/client";
import { createId } from "../api/create-id";
import { updateLinkStatsForImporter } from "../api/links/update-link-stats-for-importer";
import { logImportError } from "../tinybird/log-import-error";
import { recordClick } from "../tinybird/record-click";
import { recordLeadWithTimestamp } from "../tinybird/record-lead";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
import { RewardfulApi } from "./api";
import { MAX_BATCHES, rewardfulImporter } from "./importer";
import { RewardfulImportPayload, RewardfulReferral } from "./types";

export async function importCustomers(payload: RewardfulImportPayload) {
  const { importId, programId, campaignId, page = 1 } = payload;

  const { workspace, ...program } = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    include: {
      workspace: true,
    },
  });

  const { token } = await rewardfulImporter.getCredentials(workspace.id);

  const rewardfulApi = new RewardfulApi({ token });

  let currentPage = page;
  let hasMore = true;
  let processedBatches = 0;

  while (hasMore && processedBatches < MAX_BATCHES) {
    const referrals = await rewardfulApi.listCustomers({
      page: currentPage,
    });

    if (referrals.length === 0) {
      hasMore = false;
      break;
    }

    await Promise.all(
      referrals.map((referral) =>
        createCustomer({
          referral,
          workspace,
          program,
          campaignId,
          importId,
        }),
      ),
    );

    currentPage++;
    processedBatches++;
  }

  await rewardfulImporter.queue({
    ...payload,
    page: hasMore ? currentPage : undefined,
    action: hasMore ? "import-customers" : "import-commissions",
  });
}

// Create individual referral entries
async function createCustomer({
  referral,
  workspace,
  program,
  campaignId,
  importId,
}: {
  referral: RewardfulReferral;
  workspace: Project;
  program: Program;
  campaignId: string;
  importId: string;
}) {
  const referralId = referral.customer ? referral.customer.email : referral.id;
  if (
    referral.affiliate?.campaign?.id &&
    referral.affiliate.campaign.id !== campaignId
  ) {
    console.log(
      `Referral ${referralId} not in campaign ${campaignId} (they're in ${referral.affiliate.campaign.id}). Skipping...`,
    );

    return;
  }

  const commonImportLogInputs = {
    workspace_id: workspace.id,
    import_id: importId,
    source: "rewardful",
    entity: "customer",
    entity_id: referralId,
  } as const;

  const link = await prisma.link.findUnique({
    where: {
      domain_key: {
        domain: program.domain!,
        key: referral.link.token,
      },
    },
  });

  if (!link) {
    await logImportError({
      ...commonImportLogInputs,
      code: "LINK_NOT_FOUND",
      message: `Link not found for referral ${referralId} (token: ${referral.link.token}).`,
    });

    return;
  }

  if (
    !referral.stripe_customer_id ||
    !referral.stripe_customer_id.startsWith("cus_")
  ) {
    await logImportError({
      ...commonImportLogInputs,
      code: "STRIPE_CUSTOMER_NOT_FOUND",
      message: `No Stripe customer ID provided for referral ${referralId}.`,
    });

    return;
  }

  const customerFoundStripeId = await prisma.customer.findUnique({
    where: {
      stripeCustomerId: referral.stripe_customer_id,
    },
  });

  if (customerFoundStripeId) {
    console.log(
      `A customer already exists with Stripe customer ID ${referral.stripe_customer_id}`,
    );
    return;
  }

  const customerFoundExternalId = await prisma.customer.findUnique({
    where: {
      projectId_externalId: {
        projectId: workspace.id,
        externalId: referral.customer.id,
      },
    },
  });

  if (customerFoundExternalId) {
    console.log(
      `A customer already exists with external ID ${referral.customer.id}`,
    );
    return;
  }

  const dummyRequest = new Request(link.url, {
    headers: new Headers({
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      "x-forwarded-for": "127.0.0.1",
      "x-vercel-ip-country": "US",
      "x-vercel-ip-country-region": "CA",
      "x-vercel-ip-continent": "NA",
    }),
  });

  const clickData = await recordClick({
    req: dummyRequest,
    linkId: link.id,
    clickId: nanoid(16),
    url: link.url,
    domain: link.domain,
    key: link.key,
    workspaceId: workspace.id,
    skipRatelimit: true,
    timestamp: new Date(referral.created_at).toISOString(),
  });

  const clickEvent = clickEventSchemaTB.parse({
    ...clickData,
    bot: 0,
    qr: 0,
  });

  const customerId = createId({ prefix: "cus_" });

  await prisma.customer.create({
    data: {
      id: customerId,
      name:
        // if name is null/undefined or starts with cus_, use email as name
        !referral.customer.name || referral.customer.name.startsWith("cus_")
          ? referral.customer.email
          : referral.customer.name,
      email: referral.customer.email,
      projectId: workspace.id,
      projectConnectId: workspace.stripeConnectId,
      clickId: clickEvent.click_id,
      linkId: link.id,
      country: clickEvent.country,
      clickedAt: new Date(referral.created_at),
      createdAt: new Date(referral.became_lead_at),
      externalId: referral.customer.id,
      stripeCustomerId: referral.stripe_customer_id,
    },
  });

  await Promise.all([
    recordLeadWithTimestamp({
      ...clickEvent,
      event_id: nanoid(16),
      event_name: "Sign up",
      customer_id: customerId,
      timestamp: new Date(referral.became_lead_at).toISOString(),
    }),

    prisma.link.update({
      where: { id: link.id },
      data: {
        leads: { increment: 1 },
        lastLeadAt: updateLinkStatsForImporter({
          currentTimestamp: link.lastLeadAt,
          newTimestamp: new Date(referral.became_lead_at),
        }),
      },
    }),
  ]);
}
