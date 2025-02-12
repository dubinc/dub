import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { Program, Project } from "@prisma/client";
import { createId } from "../api/utils";
import { recordClick } from "../tinybird/record-click";
import { recordLead } from "../tinybird/record-lead";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
import { RewardfulApi } from "./api";
import { MAX_BATCHES, rewardfulImporter } from "./importer";
import { RewardfulReferral } from "./types";

export async function importReferrals({
  programId,
  page,
}: {
  programId: string;
  page: number;
}) {
  const { token } = await rewardfulImporter.getCredentials(programId);
  
  const rewardfulApi = new RewardfulApi({ token });

  let currentPage = page;
  let hasMoreReferrals = true;
  let processedBatches = 0;

  const { workspace, ...program } = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    include: {
      workspace: true,
    },
  });

  while (hasMoreReferrals && processedBatches < MAX_BATCHES) {
    const referrals = await rewardfulApi.listReferrals({
      page: currentPage,
    });

    if (referrals.length === 0) {
      hasMoreReferrals = false;
      break;
    }

    await Promise.all(
      referrals.map((referral) =>
        createReferral({
          referral,
          workspace,
          program,
        }),
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));
    currentPage++;
    processedBatches++;
  }

  if (hasMoreReferrals) {
    return await rewardfulImporter.queue({
      programId: program.id,
      action: "import-referrals",
      page: currentPage,
    });
  }

  // Imports finished
  // TODO:
  // - Send an email to the user
  // - Clear the redis cache
}

// Create individual referral entries
async function createReferral({
  referral,
  workspace,
  program,
}: {
  referral: RewardfulReferral;
  workspace: Project;
  program: Program;
}) {
  const link = await prisma.link.findFirst({
    where: {
      key: referral.link.token,
      domain: program.domain!,
      programId: program.id,
    },
  });

  if (!link) {
    console.log("Link not found", referral.link.token);
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
    workspaceId: workspace.id,
    timestamp: new Date(referral.created_at).toISOString(),
    skipRatelimit: true,
  });

  const clickEvent = clickEventSchemaTB.parse({
    ...clickData,
    bot: 0,
    qr: 0,
  });

  const customerId = createId({ prefix: "cus_" });

  await Promise.all([
    prisma.customer.create({
      data: {
        id: customerId,
        name: referral.customer.name,
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
    }),

    recordLead({
      ...clickEvent,
      event_id: nanoid(16),
      event_name: "Sign up",
      customer_id: customerId,
    }),

    prisma.link.update({
      where: { id: link.id },
      data: { leads: { increment: 1 } },
    }),

    prisma.project.update({
      where: { id: workspace.id },
      data: { usage: { increment: 1 } },
    }),
  ]);
}
