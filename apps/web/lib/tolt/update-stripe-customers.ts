import { prisma } from "@dub/prisma";
import { Customer, Project } from "@dub/prisma/client";
import Stripe from "stripe";
import { stripeAppClient } from "../stripe";
import { logImportError } from "../tinybird/log-import-error";
import { MAX_BATCHES, toltImporter } from "./importer";
import { ToltImportPayload } from "./types";

const CUSTOMERS_PER_BATCH = 20;

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { mode: "live" }),
});

// Tolt API doesn't return the Stripe customer ID,
// so we'll search for Stripe customers by email and update the customer record with the Stripe customer ID, if found.
export async function updateStripeCustomers(payload: ToltImportPayload) {
  let { importId, programId, startingAfter } = payload;

  const { workspace } = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    select: {
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
      skip: startingAfter ? 1 : 0,
      ...(startingAfter && {
        cursor: {
          id: startingAfter,
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
    startingAfter = customers[customers.length - 1].id;
  }

  await toltImporter.queue({
    ...payload,
    startingAfter: hasMore ? startingAfter : undefined,
    action: hasMore ? "update-stripe-customers" : "cleanup-partners",
  });
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
    source: "tolt",
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
    // look for the one with metadata.tolt_referral set
    const toltReferralStripeCustomer = stripeCustomers.data.find(
      ({ metadata }) => metadata.tolt_referral,
    );

    if (toltReferralStripeCustomer) {
      stripeCustomer = toltReferralStripeCustomer;
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
