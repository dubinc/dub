import { sendEmail } from "@dub/email";
import ProgramImported from "@dub/email/templates/program-imported";
import { prisma } from "@dub/prisma";
import { Customer, Project } from "@dub/prisma/client";
import Stripe from "stripe";
import { stripeAppClient } from "../stripe";
import { logImportError } from "../tinybird/log-import-error";
import { MAX_BATCHES, partnerStackImporter } from "./importer";
import { PartnerStackImportPayload } from "./types";

const CUSTOMERS_PER_BATCH = 20;

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { mode: "live" }),
});

// PartnerStack API doesn't return the Stripe customer ID,
// so we'll search for Stripe customers by email and update the customer record with the Stripe customer ID, if found.
export async function updateStripeCustomers(
  payload: PartnerStackImportPayload,
) {
  const { importId, programId, userId, startingAfter } = payload;

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
        id: "asc",
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

    await Promise.allSettled(
      customers.map((customer) =>
        searchStripeAndUpdateCustomer({
          workspace,
          customer,
          importId,
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
      to: workspaceUser.user.email,
      subject: "PartnerStack program imported",
      react: ProgramImported({
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
  importId,
}: {
  workspace: Pick<Project, "id" | "slug" | "stripeConnectId">;
  customer: Pick<Customer, "id" | "email">;
  importId: string;
}) {
  const commonImportLogInputs = {
    workspace_id: workspace.id,
    import_id: importId,
    source: "partnerstack",
    entity: "customer",
    entity_id: customer.id,
  } as const;

  const stripeCustomers = await stripe.customers.search(
    {
      query: `email:'${customer.email}'`,
    },
    {
      stripeAccount: workspace.stripeConnectId!,
    },
  );

  if (stripeCustomers.data.length === 0) {
    await logImportError({
      ...commonImportLogInputs,
      code: "STRIPE_CUSTOMER_NOT_FOUND",
      message: `Stripe search returned no customer for ${customer.email}`,
    });

    return null;
  }

  let stripeCustomer: Stripe.Customer;

  if (stripeCustomers.data.length > 1) {
    // look for the one with metadata.customer_key set
    const partnerStackStripeCustomer = stripeCustomers.data.find(
      ({ metadata }) => metadata.customer_key,
    );

    if (partnerStackStripeCustomer) {
      stripeCustomer = partnerStackStripeCustomer;
    } else {
      await logImportError({
        ...commonImportLogInputs,
        code: "STRIPE_CUSTOMER_NOT_FOUND",
        message: `Stripe search returned multiple customers for ${customer.email} for workspace ${workspace.slug} and none had metadata.tolt_referral set`,
      });

      return null;
    }
  } else {
    stripeCustomer = stripeCustomers.data[0];
  }

  await prisma.customer.update({
    where: {
      id: customer.id,
    },
    data: {
      stripeCustomerId: stripeCustomer.id,
    },
  });

  console.log(
    `Updated customer ${customer.id} with Stripe customer ID ${stripeCustomer.id}`,
  );
}
