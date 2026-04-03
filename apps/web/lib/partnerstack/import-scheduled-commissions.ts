import { prisma } from "@dub/prisma";
import { getLeadEvents } from "../tinybird/get-lead-events";
import { redis } from "../upstash";
import { PartnerStackApi } from "./api";
import { createCommissionFromPS } from "./import-commissions";
import { MAX_BATCHES, partnerStackImporter } from "./importer";
import { PartnerStackImportPayload } from "./types";

export async function importScheduledCommissions(
  payload: PartnerStackImportPayload,
) {
  const { importId, programId, startingAfter } = payload;

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
  });

  const { publicKey, secretKey } = await partnerStackImporter.getCredentials(
    program.workspaceId,
  );

  const partnerStackApi = new PartnerStackApi({
    publicKey,
    secretKey,
  });

  const fxRates = await redis.hgetall<Record<string, string>>("fxRates:usd");

  let hasMore = true;
  let processedBatches = 0;
  let currentStartingAfter = startingAfter;

  while (hasMore && processedBatches < MAX_BATCHES) {
    const scheduledCommissions = await partnerStackApi.listCommissions({
      status: "scheduled",
      startingAfter: currentStartingAfter,
    });

    if (scheduledCommissions.length === 0) {
      hasMore = false;
      break;
    }

    const customersData = await prisma.customer.findMany({
      where: {
        projectId: program.workspaceId,
        OR: [
          {
            email: {
              in: scheduledCommissions
                .map((commission) => commission.customer?.email)
                .filter(
                  (email): email is string =>
                    email !== null && email !== undefined,
                ),
            },
          },
          {
            externalId: {
              in: scheduledCommissions
                .map((commission) => commission.customer?.external_key)
                .filter(
                  (externalKey): externalKey is string =>
                    externalKey !== null && externalKey !== undefined,
                ),
            },
          },
        ],
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

    await Promise.allSettled(
      scheduledCommissions.map((commission) =>
        createCommissionFromPS({
          program,
          commission,
          fxRates,
          importId,
          customersData,
          customerLeadEvents,
        }),
      ),
    );

    currentStartingAfter =
      scheduledCommissions[scheduledCommissions.length - 1].key;
    processedBatches++;
  }

  // If there are more scheduled commissions to import, sleep for 1 second and continue the loop
  if (hasMore) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } else {
    // else, delete the credentials and exit the loop
    await partnerStackImporter.deleteCredentials(program.workspaceId);
  }

  await partnerStackImporter.queue({
    ...payload,
    startingAfter: hasMore ? currentStartingAfter : undefined,
    action: hasMore
      ? "import-scheduled-commissions"
      : "update-stripe-customers",
  });
}
