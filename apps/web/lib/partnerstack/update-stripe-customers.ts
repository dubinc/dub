import { sendEmail } from "@dub/email";
import CampaignImported from "@dub/email/templates/campaign-imported";
import { prisma } from "@dub/prisma";
import { Customer, Project } from "@dub/prisma/client";
import { log } from "@dub/utils";
import { stripeAppClient } from "../stripe";
import { MAX_BATCHES, partnerStackImporter } from "./importer";
import { PartnerStackImportPayload } from "./types";

const CUSTOMERS_PER_BATCH = 20;

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { livemode: true }),
});

// PartnerStack API doesn't return the Stripe customer ID,
// so we'll search for Stripe customers by email and update the customer record with the Stripe customer ID, if found.
export async function updateStripeCustomers(
  payload: PartnerStackImportPayload,
) {
  const { programId, userId, startingAfter } = payload;

  const { workspace, ...program } = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    select: {
      name: true,
      workspace: {
        select: {
          id: true,
          slug: true,
          stripeConnectId: true,
        },
      },
    },
  });

  if (!workspace.stripeConnectId) {
    console.error(
      `Workspace ${workspace.id} has no stripeConnectId. Skipping...`,
    );
    return;
  }

  let hasMore = true;
  let processedBatches = 0;
  let currentStartingAfter = startingAfter;

  while (hasMore && processedBatches < MAX_BATCHES) {
    const customers = await prisma.customer.findMany({
      where: {
        projectId: workspace.id,
        stripeCustomerId: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      take: CUSTOMERS_PER_BATCH,
      skip: currentStartingAfter ? 1 : 0,
      ...(currentStartingAfter && {
        cursor: {
          id: currentStartingAfter,
        },
      }),
    });

    if (customers.length === 0) {
      hasMore = false;
      break;
    }

    await Promise.all(
      customers.map((customer) =>
        searchStripeAndUpdateCustomer({
          workspace,
          customer,
        }),
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));

    processedBatches++;
    currentStartingAfter = customers[customers.length - 1].id;
  }

  if (hasMore) {
    await partnerStackImporter.queue({
      ...payload,
      startingAfter: currentStartingAfter,
      action: "update-stripe-customers",
    });
    return;
  }

  const workspaceUser = await prisma.projectUsers.findUniqueOrThrow({
    where: {
      userId_projectId: {
        userId,
        projectId: workspace.id,
      },
    },
    select: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (workspaceUser && workspaceUser.user.email) {
    await sendEmail({
      email: workspaceUser.user.email,
      subject: "PartnerStack program imported",
      react: CampaignImported({
        email: workspaceUser.user.email,
        workspace,
        program,
        provider: "PartnerStack",
      }),
    });
  }
}

async function searchStripeAndUpdateCustomer({
  workspace,
  customer,
}: {
  workspace: Pick<Project, "id" | "slug" | "stripeConnectId">;
  customer: Pick<Customer, "id" | "email">;
}) {
  const stripeCustomers = await stripe.customers.search(
    {
      query: `email:'${customer.email}'`,
    },
    {
      stripeAccount: workspace.stripeConnectId!,
    },
  );

  if (stripeCustomers.data.length === 0) {
    console.error(`Stripe search returned no customer for ${customer.email}`);
    return null;
  }

  if (stripeCustomers.data.length > 1) {
    await log({
      message: `Stripe search returned multiple customers for ${customer.email} for workspace ${workspace.slug}`,
      type: "errors",
    });

    console.error(
      `Stripe search returned multiple customers for ${customer.email}`,
    );

    return null;
  }

  const stripeCustomer = stripeCustomers.data[0];

  await prisma.customer.update({
    where: {
      id: customer.id,
    },
    data: {
      stripeCustomerId: stripeCustomer.id,
    },
  });
}
