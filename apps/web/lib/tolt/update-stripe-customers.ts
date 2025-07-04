import { prisma } from "@dub/prisma";
import { Customer, Project } from "@dub/prisma/client";
import { log } from "@dub/utils";
import { stripeAppClient } from "../stripe";
import { MAX_BATCHES, toltImporter } from "./importer";

const CUSTOMERS_PER_BATCH = 20;

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { livemode: true }),
});

// Tolt API doesn't return the Stripe customer ID,
// so we'll search for Stripe customers by email and update the customer record with the Stripe customer ID, if found.
export async function updateStripeCustomers({
  programId,
  startingAfter,
}: {
  programId: string;
  startingAfter?: string;
}) {
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
        createdAt: "asc",
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
    startingAfter = customers[customers.length - 1].id;
  }

  await toltImporter.queue({
    programId,
    action: hasMore ? "update-stripe-customers" : "cleanup-partners",
    ...(hasMore && { startingAfter }),
  });
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
