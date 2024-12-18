import { getEvents } from "@/lib/analytics/get-events";
import { getLeadEvent, recordSale } from "@/lib/tinybird";
import { clickEventSchemaTB } from "@/lib/zod/schemas/clicks";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import "dotenv-flow/config";
import { SaleEvent } from "dub/models/components";
import * as fs from "fs";
import * as Papa from "papaparse";

const workspaceId = "xxx";
let customerSpend: {
  email: string;
  amount: number;
  date: string;
}[] = [];

async function main() {
  const customers = await prisma.customer.findMany({
    where: {
      projectId: workspaceId,
    },
    select: {
      id: true,
      email: true,
      externalId: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  Papa.parse(fs.createReadStream("xxx.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: {
      data: {
        email: string;
        net_volume: string;
        created: string;
      };
    }) => {
      customerSpend.push({
        email: result.data.email,
        amount: parseFloat(result.data.net_volume),
        date: result.data.created,
      });
    },
    complete: async () => {
      const alreadyLogged = (await getEvents({
        workspaceId,
        event: "sales",
        interval: "all",
        page: 1,
        limit: 1000,
        order: "desc",
        sortBy: "timestamp",
      })) as unknown as SaleEvent[];

      const toBackfill = await Promise.all(
        customerSpend.map(async (cs) => {
          const customer = customers.find((c) => c.email === cs.email);
          if (!customer) return null;
          // if the sale has already been logged, skip
          if (
            alreadyLogged.some(
              (e) => e.customer["externalId"] === customer.externalId,
            )
          )
            return null;

          const eventId = nanoid(16);

          const leadEvent = await getLeadEvent({
            customerId: customer.id,
          });

          const clickData = clickEventSchemaTB
            .omit({ timestamp: true })
            .parse(leadEvent.data[0]);

          const saleAmount = parseInt((cs.amount * 100).toFixed(0));

          const data = {
            ...clickData,
            timestamp: new Date(cs.date).toISOString(),
            event_id: eventId,
            event_name: "Subscription creation",
            customer_id: customer.id,
            payment_processor: "stripe",
            amount: saleAmount,
            currency: "usd",
            invoice_id: "",
            metadata: "",
          };

          const tbRes = await recordSale(data);
          console.log(tbRes);
          const prismaRes = prisma.link.update({
            where: {
              id: clickData.link_id,
            },
            data: {
              sales: {
                increment: 1,
              },
              saleAmount: {
                increment: saleAmount,
              },
            },
          });
          console.log(prismaRes);

          return data;
        }),
      ).then((res) => res.filter(Boolean));

      console.log(JSON.stringify(toBackfill, null, 2));
    },
  });
}

main();
