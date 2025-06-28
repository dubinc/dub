import { createId } from "@/lib/api/create-id";
import { generateRandomName } from "@/lib/names";
import { clickEventSchemaTB } from "@/lib/zod/schemas/clicks";
import { prisma } from "@dub/prisma";
import { linkConstructorSimple, nanoid } from "@dub/utils";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";
import { recordLeadWithTimestamp } from "../../lib/tinybird/record-lead";
import { recordSaleWithTimestamp } from "../../lib/tinybird/record-sale";

/*
  Script to backfill events in Tinybird
  (script 3 of 3 for Framer backfill)
*/

type PayloadItem = {
  via: string;
  externalId: string;
  eventName: string;
  creationDate: Date;
};

let framerRemainingEvents: PayloadItem[] = [];

const FRAMER_WORKSPACE_ID = "xxx";
const DOMAIN = "framer.link";
const PAGE_NUMBER = 14;
const PAGE_SIZE = 2500;

async function main() {
  Papa.parse(
    fs.createReadStream(
      "framer_remaining_events_final_final_2024.csv",
      "utf-8",
    ),
    {
      header: true,
      skipEmptyLines: true,
      step: (result: {
        data: {
          via: string;
          externalId: string;
          eventName: string;
          creationDate: string;
        };
      }) => {
        framerRemainingEvents.push({
          ...result.data,
          creationDate: new Date(result.data.creationDate),
        });
      },
      complete: async () => {
        const start = PAGE_NUMBER * PAGE_SIZE;
        const end = (PAGE_NUMBER + 1) * PAGE_SIZE;

        console.log(
          `Processing PAGE_NUMBER ${PAGE_NUMBER}: events ${start} - ${end} of ${framerRemainingEvents.length}`,
        );

        framerRemainingEvents = framerRemainingEvents.slice(start, end);

        const links = await prisma.link.findMany({
          where: {
            shortLink: {
              in: framerRemainingEvents.map((p) =>
                linkConstructorSimple({
                  domain: DOMAIN,
                  key: p.via,
                }),
              ),
            },
          },
          select: {
            id: true,
            key: true,
            url: true,
            domain: true,
            programId: true,
            partnerId: true,
          },
        });

        let validEntries: PayloadItem[] = [];
        let invalidEntries: (PayloadItem & { error: string })[] = [];

        framerRemainingEvents.map((p) => {
          if (!links.some((l) => l.key === p.via)) {
            invalidEntries.push({
              ...p,
              error: `Link for via tag ${p.via} not found.`,
            });
            return;
          }

          if (
            links.some((l) => l.key === p.via && (!l.partnerId || !l.programId))
          ) {
            invalidEntries.push({
              ...p,
              error: `Link for via tag ${p.via} has no partnerId or programId.`,
            });
            return;
          }

          validEntries.push(p);
        });

        const linkMap = new Map(links.map((l) => [l.key, l]));

        const workspace = await prisma.project.findUniqueOrThrow({
          where: {
            id: FRAMER_WORKSPACE_ID,
          },
        });

        const customerData = validEntries.map((p) => {
          return {
            id: createId({ prefix: "cus_" }),
            name: generateRandomName(),
            externalId: p.externalId,
            projectId: workspace.id,
            projectConnectId: workspace.stripeConnectId,
            clickId: nanoid(16),
            linkId: linkMap.get(p.via)!.id,
            clickedAt: p.creationDate,
            createdAt: p.creationDate,
          };
        });

        await prisma.customer.createMany({
          data: customerData,
          skipDuplicates: true,
        });

        const finalCustomers = await prisma.customer.findMany({
          where: {
            projectId: workspace.id,
            externalId: {
              in: customerData.map((c) => c.externalId),
            },
          },
        });

        const customerMap = new Map(
          finalCustomers.map((c) => [
            c.externalId,
            { id: c.id, clickId: c.clickId },
          ]),
        );

        const dataArray = validEntries.map((p) => {
          const link = linkMap.get(p.via)!;

          const clickData = {
            timestamp: p.creationDate.toISOString(),
            identity_hash: p.externalId,
            click_id: customerMap.get(p.externalId)!.clickId,
            link_id: link.id,
            alias_link_id: "",
            url: link.url,
            ip: "",
            continent: "NA",
            country: "Unknown",
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
          };

          const clickEvent = clickEventSchemaTB.parse(clickData);

          const leadEventData = {
            ...clickEvent,
            event_id: nanoid(16),
            event_name: p.eventName,
            customer_id: customerMap.get(p.externalId)!.id,
            timestamp: p.creationDate.toISOString(),
          };

          const saleEventId = nanoid(16);

          const saleEventData = {
            ...clickEvent,
            event_id: saleEventId,
            event_name: "Invoice paid",
            amount: 0,
            customer_id: customerMap.get(p.externalId)!.id,
            payment_processor: "stripe",
            currency: "usd",
            timestamp: p.creationDate.toISOString(),
          };

          return {
            payload: p,
            linkData: link,
            clickData,
            leadEventData,
            saleEventData,
          };
        });

        // console.log("clickData");
        // console.log(dataArray.map((d) => d.clickData).slice(0, 5));

        // console.log("leadEventData");
        // console.log(dataArray.map((d) => d.leadEventData).slice(0, 5));

        // console.log("saleEventData");
        // console.log(dataArray.map((d) => d.saleEventData).slice(0, 5));

        const res = await Promise.all([
          // Record clicks
          fetch(
            `${process.env.TINYBIRD_API_URL}/v0/events?name=dub_click_events&wait=true`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
                "Content-Type": "application/x-ndjson",
              },
              body: dataArray
                .map((d) => JSON.stringify(d.clickData))
                .join("\n"),
            },
          ).then((res) => res.json()),

          // Record leads
          recordLeadWithTimestamp(dataArray.map((d) => d.leadEventData)),

          // Record sales
          recordSaleWithTimestamp(dataArray.map((d) => d.saleEventData)),
        ]);

        console.log(res);
        console.log(
          `Also encountered ${invalidEntries.length} invalid entries`,
        );
      },
    },
  );
}

main();
