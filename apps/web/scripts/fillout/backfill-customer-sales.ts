import { createId } from "@/lib/api/create-id";
import { saleEventSchemaTB } from "@/lib/zod/schemas/sales";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";
import { z } from "zod";
// import { recordSaleWithTimestamp } from "../../lib/tinybird";

const invoicesToProcess: {
  customerExternalId: string;
  invoiceId: string;
  amountPaid: string;
  createdAt: string;
}[] = [];

// backfill customer sales (similar to backfill customer leads)
async function main() {
  Papa.parse(fs.createReadStream("fillout-invoices-updated.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: {
      data: {
        customerExternalId: string;
        invoiceId: string;
        amountPaid: string;
        createdAt: string;
      };
    }) => {
      invoicesToProcess.push({
        customerExternalId: result.data.customerExternalId,
        invoiceId: result.data.invoiceId,
        amountPaid: result.data.amountPaid,
        createdAt: result.data.createdAt,
      });
    },
    complete: async () => {
      const customers = await prisma.customer.findMany({
        where: {
          projectId: "xxx",
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
        .filter((invoice) => invoice !== null);

      const salesMetadataParsed = salesMetadata.map((e) =>
        saleEventSchemaTB
          .extend({
            timestamp: z.string(),
          })
          .parse(e),
      );

      console.table(salesMetadataParsed.slice(0, 10));
      console.log(salesMetadataParsed.length);

      // const tbRes = await recordSaleWithTimestamp(salesMetadataParsed);
      // console.log(tbRes);

      const commissionsToCreate = salesMetadata.map((e) => ({
        id: createId({ prefix: "cm_" }),
        programId: "prog_xxx",
        partnerId: e.partnerId!,
        rewardId: "rw_xxx",
        customerId: e.customer_id,
        linkId: e.link_id,
        eventId: e.event_id,
        invoiceId: e.invoice_id,
        quantity: 1,
        amount: e.amount,
        type: "sale" as const,
        currency: "usd",
        earnings: Math.round(e.amount * 0.3),
        status: "pending" as const,
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

      console.log(
        JSON.stringify(Object.entries(statsByLink).slice(0, 10), null, 2),
      );

      for (const [linkId, stats] of Object.entries(statsByLink)) {
        const res = await prisma.link.update({
          where: { id: linkId },
          data: {
            sales: {
              increment: stats.sales,
            },
            saleAmount: {
              increment: stats.saleAmount,
            },
          },
        });
        console.log(
          `Updated ${linkId} to ${res.sales} sales (+${stats.sales} sales), ${res.saleAmount} saleAmount (+${stats.saleAmount} saleAmount)`,
        );
      }
    },
  });
}

main();
