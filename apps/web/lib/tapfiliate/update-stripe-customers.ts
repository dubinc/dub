import { prisma } from "@/lib/prisma";
import { Customer, Project } from "@prisma/client";
import Stripe from "stripe";
import * as z from "zod/v4";
import { stripe } from "../stripe";
import { logImportError } from "../tinybird/log-import-error";
import { TAPFILIATE_MAX_BATCHES, tapfiliateImporter } from "./importer";
import { TapfiliateImportPayload } from "./types";

export async function updateStripeCustomers(payload: TapfiliateImportPayload) {
  const { importId, programId } = payload;
  let { startingAfter } = payload;

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

  while (hasMore && processedBatches < TAPFILIATE_MAX_BATCHES) {
    const customers = await prisma.customer.findMany({
      where: {
        projectId: workspace.id,
        stripeCustomerId: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        externalId: true,
      },
      orderBy: {
        id: "asc",
      },
      take: 20,
      ...(startingAfter && {
        skip: 1,
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

  await tapfiliateImporter.queue({
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
  customer: Pick<Customer, "id" | "email" | "externalId">;
  importId: string;
}) {
  if (!customer.externalId) {
    console.log(`Customer ${customer.id} has no externalId. Skipping...`);
    return;
  }

  const commonImportLogInputs = {
    workspace_id: workspace.id,
    import_id: importId,
    source: "tapfiliate",
    entity: "customer",
    entity_id: customer.id,
  } as const;

  let stripeCustomer: Stripe.Customer | Stripe.DeletedCustomer | null = null;

  const { success: isEmail } = z.email().safeParse(customer.externalId);

  // If externalId is a valid email, do a search by email
  if (isEmail) {
    const stripeCustomers = await stripe.customers.search(
      {
        query: `email:'${customer.email}'`,
        expand: ["data.subscriptions"],
      },
      {
        stripeAccount: workspace.stripeConnectId!,
      },
    );

    // No customers found
    if (stripeCustomers.data.length === 0) {
      await logImportError({
        ...commonImportLogInputs,
        code: "STRIPE_CUSTOMER_NOT_FOUND",
        message: `Stripe search returned no customer for ${customer.email}`,
      });
      return null;
    }

    // Single customer found
    else if (stripeCustomers.data.length === 1) {
      stripeCustomer = stripeCustomers.data[0];
    }

    // More than one customer found, look for the one with subscriptions
    else {
      const customerWithSubcription = stripeCustomers.data.find(
        ({ subscriptions }) => subscriptions && subscriptions.data.length > 0,
      );

      if (!customerWithSubcription) {
        await logImportError({
          ...commonImportLogInputs,
          code: "STRIPE_CUSTOMER_NOT_FOUND",
          message: `Stripe search returned multiple customers for ${customer.email} for workspace ${workspace.slug} and none had subscriptions`,
        });
        return null;
      }

      stripeCustomer = customerWithSubcription;
    }
  }

  // If externalId is a valid Stripe customer ID, do a retrieve
  else if (customer.externalId.startsWith("cus_")) {
    stripeCustomer = await stripe.customers.retrieve(customer.externalId, {
      stripeAccount: workspace.stripeConnectId!,
    });
  }

  if (!stripeCustomer) {
    await logImportError({
      ...commonImportLogInputs,
      code: "STRIPE_CUSTOMER_NOT_FOUND",
      message: `Stripe search returned no customer for ${customer.externalId}`,
    });
    return null;
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
