import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";
import { syncTotalCommissions } from "../../lib/api/partners/sync-total-commissions";

const commissionsToBackfill: {
  partnerId: string;
  commissionAmount: number;
  createdAt: Date;
}[] = [];

const programId = "prog_xxx";

async function main() {
  Papa.parse(fs.createReadStream("custom_commissions.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: {
      data: {
        partner_id: string;
        total_commission: string;
        created_at: string;
      };
    }) => {
      commissionsToBackfill.push({
        partnerId: result.data.partner_id,
        commissionAmount: parseInt(result.data.total_commission) * 100,
        createdAt: new Date(result.data.created_at),
      });
    },
    complete: async () => {
      console.log(
        `Found ${commissionsToBackfill.length} commissions to backfill`,
      );

      const commissionsToCreate: Prisma.CommissionCreateManyInput[] =
        commissionsToBackfill.map((commission) => ({
          id: createId({ prefix: "cm_" }),
          programId,
          partnerId: commission.partnerId,
          type: "custom",
          quantity: 1,
          amount: 0,
          earnings: commission.commissionAmount,
          createdAt: commission.createdAt,
          userId: "user_xxx",
          description: "Commission backfill",
        }));

      console.table(commissionsToCreate);

      const res = await prisma.commission.createMany({
        data: commissionsToCreate,
        skipDuplicates: true,
      });
      console.log(`Created ${res.count} commissions`);

      await Promise.all(
        commissionsToCreate.map(async (commission) => {
          syncTotalCommissions({
            partnerId: commission.partnerId,
            programId,
          });
        }),
      );
    },
  });
}

main();
