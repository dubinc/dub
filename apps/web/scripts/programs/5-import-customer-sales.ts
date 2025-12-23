import { createId } from "@/lib/api/create-id";
import { calculateSaleEarnings } from "@/lib/api/sales/calculate-sale-earnings";
import { RewardProps } from "@/lib/types";
import { saleEventSchemaTB } from "@/lib/zod/schemas/sales";
import { prisma } from "@dub/prisma";
import { chunk, nanoid, prettyPrint } from "@dub/utils";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";
import { z } from "zod";
import { syncTotalCommissions } from "../../lib/api/partners/sync-total-commissions";
import { recordSaleWithTimestamp } from "../../lib/tinybird";

const programId = "prog_xxx";
const groupId = "grp_xxx";

type InvoiceData = {
  customerExternalId: string;
  invoiceId: string;
  amountPaid: string;
  createdAt: string;
};
const invoicesToProcess: InvoiceData[] = [];

// script to import customer sales (similar to 3-import-customer-leads.ts)
async function main() {
  Papa.parse(fs.createReadStream("customer_stripe_invoices.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: { data: InvoiceData }) => {
      invoicesToProcess.push(result.data);
    },
    complete: async () => {
      const program = await prisma.program.findUniqueOrThrow({
        where: {
          id: programId,
        },
        include: {
          workspace: true,
          rewards: {
            where: {
              salePartnerGroup: {
                id: groupId,
              },
            },
          },
        },
      });

      const reward = program.rewards[0];
      if (!reward) {
        throw new Error("No sale reward found for group " + groupId);
      }

      const customers = await prisma.customer.findMany({
        where: {
          projectId: program.workspace.id,
          externalId: {
            in: invoicesToProcess.map((invoice) => invoice.customerExternalId),
          },
        },
        include: {
          link: true,
        },
      });

      const salesMetadata = invoicesToProcess
        .map((invoice) => {
          // don't process invoices with amount 0
          if (invoice.amountPaid === "0") {
            return null;
          }
          const customer = customers.find(
            (customer) => customer.externalId === invoice.customerExternalId,
          );
          if (!customer) {
            return null;
          }
          if (!customer.link) {
            console.log("Customer link not found:", invoice);
            return null;
          }
          return {
            // extra data for commission creation
            partnerId: customer.link.partnerId,
            // sale data
            timestamp: new Date(invoice.createdAt).toISOString(),
            customer_id: customer.id,
            event_id: nanoid(16),
            event_name: "Invoice paid",
            payment_processor: "stripe",
            invoice_id: invoice.invoiceId,
            amount: parseInt(invoice.amountPaid),
            currency: "usd",
            metadata: "",
            // click data
            identity_hash: customer.externalId,
            click_id: customer.clickId,
            link_id: customer.link.id,
            url: customer.link.url,
            ip: "",
            continent: "NA",
            country: "US",
            region: "Unknown",
            city: "Unknown",
            latitude: "Unknown",
            longitude: "Unknown",
            vercel_region: "",
            device: "Desktop",
            device_vendor: "Unknown",
            device_model: "Unknown",
            browser: "Unknown",
            browser_version: "Unknown",
            engine: "Unknown",
            engine_version: "Unknown",
            os: "Unknown",
            os_version: "Unknown",
            cpu_architecture: "Unknown",
            ua: "Unknown",
            bot: 0,
            qr: 0,
            referer: "(direct)",
            referer_url: "(direct)",
            trigger: "link",
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      const salesMetadataParsed = salesMetadata.map((e) =>
        saleEventSchemaTB
          .extend({
            timestamp: z.string(),
          })
          .parse(e),
      );

      console.table(salesMetadataParsed.slice(0, 10));
      console.log(salesMetadataParsed.length);

      const tbRes = await recordSaleWithTimestamp(salesMetadataParsed);
      console.log(tbRes);

      const commissionsToCreate = salesMetadata.map((e) => ({
        id: createId({ prefix: "cm_" }),
        programId,
        partnerId: e.partnerId!,
        rewardId: reward.id,
        customerId: e.customer_id,
        linkId: e.link_id,
        eventId: e.event_id,
        invoiceId: e.invoice_id,
        quantity: 1,
        amount: e.amount,
        type: "sale" as const,
        currency: "usd",
        earnings: calculateSaleEarnings({
          reward: reward as RewardProps,
          sale: {
            quantity: 1,
            amount: e.amount,
          },
        }),
        // // mark all commission until nov 30 as paid
        // status: (new Date(e.timestamp) < new Date("2025-12-01")
        //   ? "paid"
        //   : "pending") as CommissionStatus,
        createdAt: new Date(e.timestamp),
      }));

      console.table(commissionsToCreate.slice(0, 10));
      const prismaRes = await prisma.commission.createMany({
        data: commissionsToCreate,
        skipDuplicates: true,
      });
      console.log(prismaRes);

      const statsByLink = salesMetadataParsed.reduce(
        (acc, sale) => {
          acc[sale.link_id] = {
            sales: (acc[sale.link_id]?.sales || 0) + 1,
            saleAmount: (acc[sale.link_id]?.saleAmount || 0) + sale.amount,
            customerIds: new Set([
              ...(acc[sale.link_id]?.customerIds || []),
              sale.customer_id,
            ]),
          };
          return acc;
        },
        {} as Record<
          string,
          {
            sales: number;
            saleAmount: number;
            customerIds: Set<string>;
          }
        >,
      );

      console.log(prettyPrint(Object.entries(statsByLink).slice(0, 10)));

      const statsByLinkChunks = chunk(Object.entries(statsByLink), 50);
      for (let i = 0; i < statsByLinkChunks.length; i++) {
        const chunk = statsByLinkChunks[i];
        console.log(
          `backfilling stats for ${chunk.length} links in batch ${i + 1} of ${statsByLinkChunks.length}`,
        );
        await Promise.all(
          chunk.map(async ([linkId, stats]) => {
            const res = await prisma.link.update({
              where: { id: linkId },
              data: {
                sales: {
                  increment: stats.sales,
                },
                saleAmount: {
                  increment: stats.saleAmount,
                },
                conversions: stats.customerIds.size,
              },
            });
            console.log(
              `Updated ${linkId} to ${res.sales} sales (+${stats.sales} sales), ${res.saleAmount} saleAmount (+${stats.saleAmount} saleAmount), ${res.conversions} conversions (+${stats.customerIds.size} conversions)`,
            );
            const syncRes = await syncTotalCommissions({
              partnerId: res.partnerId!,
              programId: program.id,
            });
            console.log("synced total commissions", prettyPrint(syncRes));
          }),
        );
      }

      const statsByCustomer = salesMetadataParsed.reduce(
        (acc, sale) => {
          acc[sale.customer_id] = {
            sales: (acc[sale.customer_id]?.sales || 0) + 1,
            saleAmount: (acc[sale.customer_id]?.saleAmount || 0) + sale.amount,
          };
          return acc;
        },
        {} as Record<
          string,
          {
            sales: number;
            saleAmount: number;
          }
        >,
      );
      console.log(prettyPrint(Object.entries(statsByCustomer).slice(0, 10)));

      const statsByCustomerChunks = chunk(Object.entries(statsByCustomer), 50);
      for (let i = 0; i < statsByCustomerChunks.length; i++) {
        const chunk = statsByCustomerChunks[i];
        console.log(
          `backfilling stats for ${chunk.length} customers in batch ${i + 1} of ${statsByCustomerChunks.length}`,
        );
        await Promise.all(
          chunk.map(async ([customerId, stats]) => {
            const res = await prisma.customer.update({
              where: { id: customerId },
              data: {
                sales: { increment: stats.sales },
                saleAmount: { increment: stats.saleAmount },
              },
            });
            console.log(
              `Updated ${customerId} to ${res.sales} sales (+${stats.sales} sales), ${res.saleAmount} saleAmount (+${stats.saleAmount} saleAmount)`,
            );
          }),
        );
      }
    },
  });
}

main();
