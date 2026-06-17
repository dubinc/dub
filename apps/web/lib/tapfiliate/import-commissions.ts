import { prisma } from "@dub/prisma";
import { Customer, Link, Program } from "@dub/prisma/client";
import { getLeadEvents } from "../tinybird/get-lead-events";
import { LeadEventTB } from "../types";
import { redis } from "../upstash";
import { TapfiliateApi } from "./api";
import { TAPFILIATE_MAX_BATCHES, tapfiliateImporter } from "./importer";
import { TapfiliateCommission, TapfiliateImportPayload } from "./types";

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
    const conversions = await tapfiliateApi.listConversions({
      programId: tapfiliateProgramId,
      page: currentPage,
    });

    if (conversions.length === 0) {
      hasMore = false;
      break;
    }

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

    const commissions = conversions.flatMap(
      (conversion) => conversion.commissions ?? [],
    );

    await Promise.allSettled(
      commissions.map((commission) =>
        createCommission({
          program,
          commission,
          fxRates,
          importId,
          customersData,
          customerLeadEvents,
        }),
      ),
    );

    currentPage++;
    processedBatches++;
  }

  await tapfiliateImporter.queue({
    ...payload,
    action: hasMore ? "import-commissions" : "update-stripe-customers",
    page: currentPage,
  });
}

async function createCommission({
  program,
  commission,
  fxRates,
  importId,
  customersData,
  customerLeadEvents,
}: {
  program: Pick<Program, "id" | "workspaceId">;
  commission: TapfiliateCommission;
  fxRates: Record<string, string> | null;
  importId: string;
  customersData: (Customer & { link: Link | null })[];
  customerLeadEvents: LeadEventTB[];
}) {
  //
}
