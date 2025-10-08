import { createId } from "@/lib/api/create-id";
import { generateRandomName } from "@/lib/names";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

let leadsToBackfill: {
  customerExternalId: string;
  partnerLinkKey: string;
  stripeCustomerId: string;
  timestamp: string;
}[] = [];

async function main() {
  Papa.parse(fs.createReadStream("fillout-customers.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: {
      data: {
        userId: string;
        referral: string;
        stripeCustomerId: string;
        createdAt: string;
      };
    }) => {
      leadsToBackfill.push({
        customerExternalId: result.data.userId,
        partnerLinkKey: result.data.referral,
        stripeCustomerId: result.data.stripeCustomerId,
        timestamp: result.data.createdAt,
      });
    },
    complete: async () => {
      console.log(`Found ${leadsToBackfill.length} leads to backfill`);
      console.table(leadsToBackfill.slice(0, 10));

      const workspace = await prisma.project.findUniqueOrThrow({
        where: {
          id: "xxx",
        },
      });

      const partnerLinks = await prisma.link.findMany({
        where: {
          domain: "try.fillout.com",
          key: {
            in: leadsToBackfill.map((lead) => lead.partnerLinkKey),
          },
        },
      });

      const statsByLink = leadsToBackfill
        .filter((lead) =>
          partnerLinks.some(
            (link) =>
              link.key.toLowerCase() === lead.partnerLinkKey.toLowerCase(),
          ),
        )
        .reduce(
          (acc, lead) => {
            const link = partnerLinks.find(
              (link) =>
                link.key.toLowerCase() === lead.partnerLinkKey.toLowerCase(),
            )!;
            acc[link.id] = {
              clicks: (acc[link.id]?.clicks || 0) + 1,
              leads: (acc[link.id]?.leads || 0) + 1,
              conversions: (acc[link.id]?.conversions || 0) + 1,
            };
            return acc;
          },
          {} as Record<
            string,
            {
              clicks: number;
              leads: number;
              conversions: number;
            }
          >,
        );

      console.log(
        JSON.stringify(Object.entries(statsByLink).slice(0, 10), null, 2),
      );

      //   for (const [linkId, stats] of Object.entries(statsByLink)) {
      //     const res = await prisma.link.update({
      //       where: { id: linkId },
      //       data: {
      //         clicks: {
      //           increment: stats.clicks,
      //         },
      //         leads: {
      //           increment: stats.leads,
      //         },
      //       },
      //     });
      //     console.log(
      //       `Updated ${linkId} to ${res.clicks} clicks (+${stats.clicks} clicks), ${res.leads} leads (+${stats.leads} leads), ${res.conversions} conversions (+${stats.conversions} conversions)`,
      //     );
      //   }

      const clicksToCreate = leadsToBackfill
        .map((lead) => {
          const link = partnerLinks.find(
            (link) =>
              link.key.toLowerCase() === lead.partnerLinkKey.toLowerCase(),
          );
          if (!link) {
            return null;
          }

          const clickId = nanoid(16);

          return {
            timestamp: new Date(lead.timestamp).toISOString(),
            identity_hash: lead.customerExternalId,
            click_id: clickId,
            link_id: link.id,
            url: link.url,
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
        .filter((c) => c !== null);

      console.table(clicksToCreate.slice(0, 10));

      // Record clicks
      // const clickRes = await fetch(
      //   `${process.env.TINYBIRD_API_URL}/v0/events?name=dub_click_events&wait=true`,
      //   {
      //     method: "POST",
      //     headers: {
      //       Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
      //       "Content-Type": "application/x-ndjson",
      //     },
      //     body: clicksToCreate.map((d) => JSON.stringify(d)).join("\n"),
      //   },
      // ).then((res) => res.json());
      // console.log("backfilled clicks", JSON.stringify(clickRes, null, 2));

      const customersToCreate = leadsToBackfill
        .map((lead, idx) => {
          const clickData = clicksToCreate[idx];
          if (!clickData) {
            return null;
          }
          return {
            id: createId({ prefix: "cus_" }),
            name: generateRandomName(),
            externalId: lead.customerExternalId,
            projectId: workspace.id,
            projectConnectId: workspace.stripeConnectId,
            stripeCustomerId: lead.stripeCustomerId,
            clickId: clickData.click_id,
            linkId: clickData.link_id,
            country: clickData.country,
            clickedAt: new Date(lead.timestamp).toISOString(),
            createdAt: new Date(lead.timestamp).toISOString(),
          };
        })
        .filter((c) => c !== null);

      console.table(customersToCreate.slice(0, 10));

      // const customerRes = await prisma.customer.createMany({
      //   data: customersToCreate,
      //   skipDuplicates: true,
      // });
      // console.log("backfilled customers", JSON.stringify(customerRes, null, 2));

      // const leadsToCreate = clicksToCreate.map((clickData, idx) => ({
      //   ...clickData,
      //   event_id: nanoid(16),
      //   event_name: "activated",
      //   customer_id: customersToCreate[idx]!.id,
      // }));

      // const leadRes = await recordLeadWithTimestamp(leadsToCreate);
      // console.log("backfilled leads", JSON.stringify(leadRes, null, 2));
    },
  });
}

main();
