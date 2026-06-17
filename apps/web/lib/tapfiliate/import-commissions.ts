import { prisma } from "@dub/prisma";
import { Customer, Link, Program } from "@dub/prisma/client";
import { nanoid } from "@dub/utils";
import { convertCurrencyWithFxRates } from "../analytics/convert-currency";
import { isFirstConversion } from "../analytics/is-first-conversion";
import { createId } from "../api/create-id";
import { updateLinkStatsForImporter } from "../api/links/update-link-stats-for-importer";
import { syncPartnerLinksStats } from "../api/partners/sync-partner-links-stats";
import { syncTotalCommissions } from "../api/partners/sync-total-commissions";
import { getLeadEvents } from "../tinybird/get-lead-events";
import { logImportError } from "../tinybird/log-import-error";
import { recordSaleWithTimestamp } from "../tinybird/record-sale";
import { LeadEventTB } from "../types";
import { redis } from "../upstash";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
import { TapfiliateApi } from "./api";
import { TAPFILIATE_MAX_BATCHES, tapfiliateImporter } from "./importer";
import {
  TapfiliateConversionWithCommission,
  TapfiliateImportPayload,
} from "./types";

export async function importCommissions(payload: TapfiliateImportPayload) {
  const { importId, programId, tapfiliateProgramId, page = 1 } = payload;

  const program = await prisma.program.findUnique({
    where: {
      id: programId,
    },
    select: {
      id: true,
      workspaceId: true,
    },
  });

  if (!program) {
    console.error(`Program ${programId} not found.`);
    return;
  }

  const { apiKey } = await tapfiliateImporter.getCredentials(
    program.workspaceId,
  );

  const tapfiliateApi = new TapfiliateApi({
    apiKey,
  });

  const fxRates = await redis.hgetall<Record<string, string>>("fxRates:usd");

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

    const customerExternalIds = conversions
      .map((conversion) => conversion.customer?.customer_id)
      .filter((id): id is string => Boolean(id));

    const customersData = await prisma.customer.findMany({
      where: {
        projectId: program.workspaceId,
        externalId: {
          in: customerExternalIds,
        },
      },
      include: {
        link: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const customerLeadEvents = await getLeadEvents({
      customerIds: customersData.map((customer) => customer.id),
    }).then((res) => res.data);

    const flattenedConversions = conversions.flatMap((conversion) =>
      (conversion.commissions ?? []).map((commission) => ({
        ...conversion,
        commission,
      })),
    );

    await Promise.allSettled(
      flattenedConversions.map((conversion) =>
        createCommission({
          program,
          conversion,
          fxRates,
          importId,
          customersData,
          customerLeadEvents,
        }),
      ),
    );

    currentPage++;
    processedBatches++;
    break;
  }

  await tapfiliateImporter.queue({
    ...payload,
    action: hasMore ? "import-commissions" : "update-stripe-customers",
    page: currentPage,
  });
}

async function createCommission({
  program,
  conversion,
  fxRates,
  importId,
  customersData,
  customerLeadEvents,
}: {
  program: Pick<Program, "id" | "workspaceId">;
  conversion: TapfiliateConversionWithCommission;
  fxRates: Record<string, string> | null;
  importId: string;
  customersData: (Customer & { link: Link | null })[];
  customerLeadEvents: LeadEventTB[];
}) {
  const { id, commission, customer } = conversion;

  const commonImportLogInputs = {
    workspace_id: program.workspaceId,
    import_id: importId,
    source: "tapfiliate",
    entity: "commission",
    entity_id: commission.id,
  };

  const existingCommission = await prisma.commission.findUnique({
    where: {
      invoiceId_programId: {
        invoiceId: `${commission.id}`,
        programId: program.id,
      },
    },
  });

  if (existingCommission) {
    console.log(`Commission ${commission.id} already exists, skipping...`);
    return;
  }

  if (!customer) {
    await logImportError({
      ...commonImportLogInputs,
      code: "CUSTOMER_NOT_FOUND",
      message: `No customer found for commission ${commission.id}.`,
    });

    return;
  }

  const existingCustomer = customersData.find(
    ({ externalId }) => externalId === customer?.customer_id,
  );

  if (!existingCustomer) {
    await logImportError({
      ...commonImportLogInputs,
      code: "CUSTOMER_NOT_FOUND",
      message: `No customer ${customer.customer_id} found for commission ${commission.id}.`,
    });

    return;
  }

  let saleAmount = Number(commission.amount ?? 0);
  let earnings = Number(commission.conversion_sub_amount);

  if (commission.currency.toUpperCase() !== "USD" && fxRates) {
    const { amount: convertedSaleAmount } = convertCurrencyWithFxRates({
      currency: commission.currency,
      amount: saleAmount,
      fxRates,
    });

    const { amount: convertedEarnings } = convertCurrencyWithFxRates({
      currency: commission.currency,
      amount: earnings,
      fxRates,
    });

    saleAmount = convertedSaleAmount;
    earnings = convertedEarnings;
  }

  console.log("existingCustomer", existingCustomer);

  if (!existingCustomer.linkId) {
    await logImportError({
      ...commonImportLogInputs,
      code: "LINK_NOT_FOUND",
      message: `No link found for customer ${existingCustomer.id}.`,
    });

    return;
  }

  if (!existingCustomer.clickId) {
    await logImportError({
      ...commonImportLogInputs,
      code: "CLICK_NOT_FOUND",
      message: `No click found for customer ${existingCustomer.id}.`,
    });

    return;
  }

  if (!existingCustomer.link?.partnerId) {
    await logImportError({
      ...commonImportLogInputs,
      code: "PARTNER_NOT_FOUND",
      message: `No partner found for customer ${existingCustomer.id}.`,
    });

    return;
  }

  const leadEvent = customerLeadEvents.find(
    (event) => event.customer_id === existingCustomer.id,
  );

  if (!leadEvent) {
    await logImportError({
      ...commonImportLogInputs,
      code: "LEAD_NOT_FOUND",
      message: `No lead event found for customer ${existingCustomer.id}.`,
    });

    return;
  }

  const clickData = clickEventSchemaTB
    .omit({ timestamp: true })
    .parse(leadEvent);

  const eventId = nanoid(16);

  await Promise.all([
    prisma.commission.create({
      data: {
        id: createId({ prefix: "cm_" }),
        eventId,
        type: "sale",
        programId: program.id,
        partnerId: existingCustomer.link.partnerId,
        linkId: existingCustomer.linkId,
        customerId: existingCustomer.id,
        amount: saleAmount,
        earnings,
        // TODO: allow custom "defaultCurrency" on workspace table in the future
        currency: "usd",
        quantity: 1,
        // status: toDubStatus[commission.status],
        invoiceId: commission.id.toString(), // this is not the actual invoice ID, but we use this to deduplicate the sales
        createdAt: new Date(commission.created_at),
      },
    }),

    saleAmount > 0 &&
      recordSaleWithTimestamp({
        ...clickData,
        event_id: eventId,
        event_name: "Invoice paid",
        amount: saleAmount,
        customer_id: existingCustomer.id,
        payment_processor: "stripe",
        currency: "usd",
        metadata: JSON.stringify(commission),
        timestamp: new Date(commission.created_at).toISOString(),
      }),

    // update link stats (if sale amount is greater than 0)
    prisma.link.update({
      where: {
        id: existingCustomer.linkId,
      },
      data: {
        ...(isFirstConversion({
          customer: existingCustomer,
          linkId: existingCustomer.linkId,
        }) && {
          conversions: {
            increment: 1,
          },
          lastConversionAt: updateLinkStatsForImporter({
            currentTimestamp: existingCustomer.link.lastConversionAt,
            newTimestamp: new Date(commission.created_at),
          }),
        }),
        ...(saleAmount > 0 && {
          sales: {
            increment: 1,
          },
          saleAmount: {
            increment: saleAmount,
          },
        }),
      },
    }),

    syncPartnerLinksStats({
      partnerId: existingCustomer.link.partnerId,
      programId: program.id,
      eventType: "sale",
    }),

    // update customer stats (if sale amount is greater than 0)
    saleAmount > 0 &&
      prisma.customer.update({
        where: {
          id: existingCustomer.id,
        },
        data: {
          sales: {
            increment: 1,
          },
          saleAmount: {
            increment: saleAmount,
          },
          firstSaleAt: existingCustomer.firstSaleAt ? undefined : new Date(),
        },
      }),
  ]);

  await syncTotalCommissions({
    partnerId: existingCustomer.link.partnerId,
    programId: program.id,
  });
}
