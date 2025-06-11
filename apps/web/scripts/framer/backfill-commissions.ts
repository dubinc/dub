import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import { CommissionStatus, CommissionType } from "@prisma/client";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

const partnersToBackfill: {
  partnerEmail: string;
  totalCommissionCents: number;
}[] = [];

const FRAMER_PROGRAM_ID = "prog_";
const MONTH_TO_BACKFILL = new Date("2025-04-01");

async function main() {
  // First read the sales data
  Papa.parse(fs.createReadStream("framer_backfill_commissions.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: {
      data: {
        partner_email: string;
        total_commission_cents: string;
      };
    }) => {
      partnersToBackfill.push({
        partnerEmail: result.data.partner_email,
        totalCommissionCents: parseInt(result.data.total_commission_cents),
      });
    },
    complete: async () => {
      console.log(`Found ${partnersToBackfill.length} partners to backfill`);
      const partners = await prisma.partner.findMany({
        where: {
          email: {
            in: partnersToBackfill.map((p) => p.partnerEmail),
          },
        },
      });

      const processedData = partnersToBackfill
        .map((p) => {
          const partner = partners.find((_p) => _p.email === p.partnerEmail);
          if (!partner) {
            return null;
          }
          return {
            partnerId: partner.id,
            ...p,
          };
        })
        .filter((f) => f !== null);

      console.table(processedData);

      const manualCommissions = processedData.map((d) => {
        return {
          id: createId({ prefix: "cm_" }),
          programId: FRAMER_PROGRAM_ID,
          partnerId: d.partnerId,
          type: CommissionType.custom,
          amount: 0,
          quantity: 1,
          earnings: d.totalCommissionCents,
          status: CommissionStatus.pending,
          createdAt: MONTH_TO_BACKFILL,
        };
      });

      console.table(manualCommissions);

      // Add manual commissions to the database
      // await prisma.commission.createMany({
      //   data: manualCommissions,
      //   skipDuplicates: true,
      // });
    },
  });
}

main();
