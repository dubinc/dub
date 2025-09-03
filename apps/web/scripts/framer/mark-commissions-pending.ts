import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

let eventIds: string[] = [];

async function main() {
  Papa.parse(fs.createReadStream("framer_pending_event_ids.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: { data: { event_id: string } }) => {
      eventIds.push(result.data.event_id);
    },
    complete: async () => {
      const commissionsToUpdate = await prisma.commission.findMany({
        where: {
          eventId: { in: eventIds },
          status: {
            not: "pending",
          },
        },
        take: 500,
      });

      const updateCommissions = await prisma.commission.updateMany({
        where: {
          id: { in: commissionsToUpdate.map((commission) => commission.id) },
        },
        data: {
          status: "pending",
        },
      });

      console.log(`Updated ${updateCommissions.count} commissions`);
    },
  });
}

main();
