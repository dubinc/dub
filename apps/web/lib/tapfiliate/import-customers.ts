import { prisma } from "@/lib/prisma";
import { chunk, nanoid } from "@dub/utils";
import { Customer, Link, Project } from "@prisma/client";
import { createId } from "../api/create-id";
import { updateLinkStatsForImporter } from "../api/links/update-link-stats-for-importer";
import { syncPartnerLinksStats } from "../api/partners/sync-partner-links-stats";
import { recordClick, recordLeadWithTimestamp } from "../tinybird";
import { logImportError } from "../tinybird/log-import-error";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
import { TapfiliateClient } from "./client";
import { TAPFILIATE_MAX_BATCHES, tapfiliateImporter } from "./importer";
import {
  TapfiliateConversion,
  TapfiliateCustomer,
  TapfiliateImportPayload,
} from "./types";

export function getTapfiliateCustomerExternalId(
  conversion: Pick<TapfiliateConversion, "customer" | "external_id">,
): string | null {
  return conversion.customer?.customer_id ?? conversion.external_id ?? null;
}

export async function importCustomers(payload: TapfiliateImportPayload) {
  const {
    importId,
    programId,
    tapfiliateProgramId,
    page = 1,
    customerSource = "customers",
  } = payload;

  const program = await prisma.program.findUnique({
    where: {
      id: programId,
    },
    include: {
      workspace: {
        select: {
          id: true,
          plan: true,
          stripeConnectId: true,
        },
      },
    },
  });

  if (!program) {
    console.error(`Program ${programId} not found.`);
    return;
  }

  if (!program.domain || !program.url) {
    console.error("Program domain or url not found", program.id);
    return;
  }

  const { workspace } = program;

  const { apiKey } = await tapfiliateImporter.getCredentials(workspace.id);

  const tapfiliateApi = new TapfiliateClient({
    apiKey,
  });

  if (customerSource === "conversions") {
    await importCustomersFromConversions({
      payload,
      program: {
        domain: program.domain,
        workspace,
      },
      tapfiliateApi,
      tapfiliateProgramId,
      importId,
      page,
    });
    return;
  }

  let currentPage = page;
  let hasMore = true;
  let processedBatches = 0;

  while (hasMore && processedBatches < TAPFILIATE_MAX_BATCHES) {
    let customers = await tapfiliateApi.listCustomers({
      programId: tapfiliateProgramId,
      page: currentPage,
    });

    if (customers.length === 0) {
      hasMore = false;
      break;
    }

    // Filter customers by program and affiliate
    customers = customers.filter(
      (customer) =>
        customer.program?.id === tapfiliateProgramId && customer.affiliate?.id,
    );

    await createCustomers({
      workspace,
      domain: program.domain,
      importId,
      customers,
    });

    currentPage++;
    processedBatches++;
  }

  await tapfiliateImporter.queue({
    ...payload,
    action: "import-customers",
    customerSource: hasMore ? "customers" : "conversions",
    page: hasMore ? currentPage : 1,
  });
}

async function importCustomersFromConversions({
  payload,
  program,
  tapfiliateApi,
  tapfiliateProgramId,
  importId,
  page,
}: {
  payload: TapfiliateImportPayload;
  program: {
    domain: string;
    workspace: Pick<Project, "id" | "stripeConnectId">;
  };
  tapfiliateApi: TapfiliateClient;
  tapfiliateProgramId: string;
  importId: string;
  page: number;
}) {
  let currentPage = page;
  let hasMore = true;
  let processedBatches = 0;

  while (hasMore && processedBatches < TAPFILIATE_MAX_BATCHES) {
    let conversions = await tapfiliateApi.listConversions({
      programId: tapfiliateProgramId,
      page: currentPage,
    });

    if (conversions.length === 0) {
      hasMore = false;
      break;
    }

    conversions = conversions.filter(
      (conversion) => conversion.program?.id === tapfiliateProgramId,
    );

    const customersByExternalId = new Map<string, TapfiliateCustomer>();

    for (const conversion of conversions) {
      const externalId = getTapfiliateCustomerExternalId(conversion);
      const affiliateId =
        conversion.affiliate?.id ?? conversion.customer?.affiliate?.id;

      if (!externalId || !affiliateId) {
        continue;
      }

      const existing = customersByExternalId.get(externalId);

      if (!existing || conversion.created_at < existing.created_at) {
        customersByExternalId.set(externalId, {
          id: String(conversion.id),
          customer_id: externalId,
          created_at: conversion.created_at,
          click: conversion.click ?? null,
          program: conversion.program,
          affiliate: { id: affiliateId },
        });
      }
    }

    await createCustomers({
      workspace: program.workspace,
      domain: program.domain,
      importId,
      customers: [...customersByExternalId.values()],
    });

    currentPage++;
    processedBatches++;
  }

  await tapfiliateImporter.queue({
    ...payload,
    action: hasMore ? "import-customers" : "import-commissions",
    customerSource: hasMore ? "conversions" : undefined,
    page: hasMore ? currentPage : undefined,
  });
}

async function createCustomers({
  workspace,
  domain,
  importId,
  customers,
}: {
  workspace: Pick<Project, "id" | "stripeConnectId">;
  domain: string;
  importId: string;
  customers: TapfiliateCustomer[];
}) {
  const customersWithAffiliate = customers.filter(
    (customer) => customer.affiliate?.id,
  );

  if (customersWithAffiliate.length === 0) {
    return;
  }

  // Map the Tapfiliate affiliate id -> the partner's referral link (link key = affiliate id)
  const affiliateIds = [
    ...new Set(
      customersWithAffiliate.map((customer) => customer.affiliate!.id),
    ),
  ];

  const links = await prisma.link.findMany({
    where: {
      domain,
      key: {
        in: affiliateIds,
      },
    },
    select: {
      id: true,
      key: true,
      domain: true,
      url: true,
      partnerId: true,
      programId: true,
      lastLeadAt: true,
    },
  });

  const affiliateIdToLink = new Map(links.map((link) => [link.key, link]));
  const customerExternalIds = [
    ...new Set(customersWithAffiliate.map((customer) => customer.customer_id)),
  ];

  // Find the existing customers by their external customer_id
  const existingCustomers = await prisma.customer.findMany({
    where: {
      projectId: workspace.id,
      externalId: {
        in: customerExternalIds,
      },
    },
    select: {
      id: true,
      externalId: true,
    },
  });

  const newCustomers = customersWithAffiliate.filter(
    (customer) =>
      !existingCustomers.some((c) => c.externalId === customer.customer_id),
  );

  if (newCustomers.length === 0) {
    return;
  }

  const customerChunks = chunk(newCustomers, 10);

  for (const customerChunk of customerChunks) {
    await Promise.all(
      customerChunk.map((customer) =>
        createCustomer({
          workspace,
          customer,
          link: affiliateIdToLink.get(customer.affiliate!.id),
          importId,
        }),
      ),
    );
  }
}

async function createCustomer({
  workspace,
  customer,
  link,
  importId,
}: {
  workspace: Pick<Project, "id" | "stripeConnectId">;
  customer: TapfiliateCustomer;
  link?: Pick<
    Link,
    "id" | "key" | "domain" | "url" | "partnerId" | "programId" | "lastLeadAt"
  >;
  importId: string;
}) {
  const externalId = customer.customer_id;

  const commonImportLogInputs = {
    workspace_id: workspace.id,
    import_id: importId,
    source: "tapfiliate",
    entity: "customer",
    entity_id: externalId,
  } as const;

  if (!link) {
    await logImportError({
      ...commonImportLogInputs,
      code: "LINK_NOT_FOUND",
      message: `No link found for customer ${externalId} (affiliate ${customer.affiliate?.id}).`,
    });

    return;
  }

  const tapfiliateClickData = customer.click;
  const clickedAt = new Date(
    tapfiliateClickData?.created_at || customer.created_at,
  );

  const dummyRequest = new Request(link.url, {
    headers: new Headers({
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      "x-forwarded-for": "127.0.0.1",
      "x-vercel-ip-country": "US",
      "x-vercel-ip-country-region": "CA",
      "x-vercel-ip-continent": "NA",
    }),
    ...(tapfiliateClickData?.referrer && {
      referrer: tapfiliateClickData.referrer,
    }),
  });

  const clickData = await recordClick({
    req: dummyRequest,
    clickId: nanoid(16),
    workspaceId: workspace.id,
    linkId: link.id,
    domain: link.domain,
    key: link.key,
    url: link.url,
    skipRatelimit: true,
    timestamp: clickedAt.toISOString(),
  });

  const clickEvent = clickEventSchemaTB.parse({
    ...clickData,
    bot: 0,
    qr: 0,
  });

  let createdCustomer: Customer | null = null;

  try {
    createdCustomer = await prisma.customer.create({
      data: {
        id: createId({ prefix: "cus_" }),
        name: externalId,
        externalId,
        projectId: workspace.id,
        projectConnectId: workspace.stripeConnectId,
        clickId: clickEvent.click_id,
        linkId: link.id,
        programId: link.programId,
        partnerId: link.partnerId,
        country: clickEvent.country,
        clickedAt,
        createdAt: new Date(customer.created_at),
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      console.warn(
        `Customer with external ID ${externalId} already exists. Skipping...`,
      );
    } else {
      console.error("Error creating customer", customer, error);
    }

    return;
  }

  await Promise.all([
    recordLeadWithTimestamp({
      ...clickEvent,
      event_id: nanoid(16),
      event_name: "Sign up",
      customer_id: createdCustomer.id,
      timestamp: new Date(customer.created_at).toISOString(),
    }),

    prisma.link.update({
      where: {
        id: link.id,
      },
      data: {
        leads: {
          increment: 1,
        },
        lastLeadAt: updateLinkStatsForImporter({
          currentTimestamp: link.lastLeadAt,
          newTimestamp: new Date(customer.created_at),
        }),
      },
    }),

    // partner links should always have a partnerId and programId, but we're doing this to make TS happy
    ...(link.partnerId && link.programId
      ? [
          syncPartnerLinksStats({
            partnerId: link.partnerId,
            programId: link.programId,
            eventType: "lead",
          }),
        ]
      : []),
  ]);
}
