// @ts-ignore
import "dotenv-flow/config";

import { toErrorFields } from "@/lib/axiom/server";
import { prisma } from "@/lib/prisma";
import { createTremendousCampaign } from "@/lib/tremendous/create-tremendous-campaign";
import { prettyPrint } from "@dub/utils";

const BATCH_SIZE = 50;

async function main() {
  let totalCreated = 0;
  let totalFailed = 0;
  const failedIds = new Set<string>();

  while (true) {
    const programs = await prisma.program.findMany({
      where: {
        tremendousCampaignId: null,
        id: failedIds.size
          ? {
              notIn: Array.from(failedIds),
            }
          : undefined,
        invoices: {
          some: {
            type: "partnerPayout",
          },
        },
      },
      select: {
        id: true,
        name: true,
        logo: true,
        tremendousCampaignId: true,
      },
      orderBy: {
        id: "asc",
      },
      take: BATCH_SIZE,
    });

    if (programs.length === 0) {
      break;
    }

    console.table(
      programs.map((program) => ({
        id: program.id,
        name: program.name,
      })),
    );

    for (const program of programs) {
      try {
        await createTremendousCampaign(program);
        totalCreated++;
      } catch (error) {
        totalFailed++;
        failedIds.add(program.id);
        const { message, status, response } = toErrorFields(error);
        console.error(
          `Failed to create Tremendous campaign for program ${program.id}: ${message}`,
          {
            status,
            response: prettyPrint(response),
          },
        );
      }
    }
  }

  console.log(`Done. Created ${totalCreated}, failed ${totalFailed}.`);
}

main();
