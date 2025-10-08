// @ts-nocheck some weird typing issues below

import { createId } from "@/lib/api/create-id";
import { generateRandomName } from "@/lib/names";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";
import { recordLeadWithTimestamp } from "../../lib/tinybird/record-lead";

let leadsToBackfill: {
  customerExternalId: string;
  partnerLinkKey: string;
  stripeCustomerId: string | null;
  timestamp: string;
}[] = [];

// script to backfill customers + leads
// we also use a batching logic for tinybird events ingestion
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
        stripeCustomerId: result.data.stripeCustomerId || null,
        timestamp: result.data.createdAt,
      });
    },
    complete: async () => {
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

      // filter out leads that are not associated with a partner link
      const finalLeadsToBackfill = leadsToBackfill.filter((lead) =>
        partnerLinks.some(
          (link) =>
            link.key.toLowerCase() === lead.partnerLinkKey.toLowerCase(),
        ),
      );

      console.log(`Found ${finalLeadsToBackfill.length} leads to backfill`);
      console.table(finalLeadsToBackfill.slice(0, 10));

      const clicksToCreate = finalLeadsToBackfill
        .map((lead) => {
          const link = partnerLinks.find(
            (link) =>
              link.key.toLowerCase() === lead.partnerLinkKey.toLowerCase(),
          )!; // coerce here cause we already filtered out leads that are not associated with a partner link above

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

      // clickhouse only supports max 12 partitions (months) for a given event backfill
      // so we need to transform this into a list of lists, one for each year
      const clicksToCreateTB = clicksToCreate.reduce(
        (acc, curr) => {
          const year = new Date(curr.timestamp).getFullYear();
          if (!acc[year]) {
            acc[year] = [];
          }
          acc[year].push(curr);
          return acc;
        },
        {} as Record<number, any[]>,
      );

      // Record clicks
      Object.entries(clicksToCreateTB).forEach(async ([year, clicks]) => {
        const clicksBatch = clicks as typeof clicksToCreate;
        console.log(`backfilling ${clicksBatch.length} clicks for ${year}`);
        const clickRes = await fetch(
          `${process.env.TINYBIRD_API_URL}/v0/events?name=dub_click_events&wait=true`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
              "Content-Type": "application/x-ndjson",
            },
            body: (clicksBatch as typeof clicksToCreate)
              .map((d) => JSON.stringify(d))
              .join("\n"),
          },
        ).then((res) => res.json());
        console.log("backfilled clicks", JSON.stringify(clickRes, null, 2));
      });

      const customersToCreate = finalLeadsToBackfill
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

      const customerRes = await prisma.customer.createMany({
        data: customersToCreate,
        skipDuplicates: true,
      });
      console.log("backfilled customers", JSON.stringify(customerRes, null, 2));

      const leadsToCreate = clicksToCreate.map((clickData, idx) => ({
        ...clickData,
        event_id: nanoid(16),
        event_name: "Sign up",
        customer_id: customersToCreate[idx]!.id,
      }));

      // same batching logic as above
      const leadsToCreateTB = leadsToCreate.reduce(
        (acc, curr) => {
          const year = new Date(curr.timestamp).getFullYear();
          if (!acc[year]) {
            acc[year] = [];
          }
          acc[year].push(curr);
          return acc;
        },
        {} as Record<number, any[]>,
      );

      Object.entries(leadsToCreateTB).forEach(async ([year, leads]) => {
        const leadsBatch = leads as typeof leadsToCreate;
        console.log(`backfilling ${leadsBatch.length} leads for ${year}`);
        const leadRes = await recordLeadWithTimestamp(leadsBatch);
        console.log("backfilled leads", JSON.stringify(leadRes, null, 2));
      });

      const statsByLink = finalLeadsToBackfill
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
            const leadCreatedAt = new Date(lead.timestamp);
            acc[link.id] = {
              clicks: (acc[link.id]?.clicks || 0) + 1,
              leads: (acc[link.id]?.leads || 0) + 1,
              // if there is no lastLeadAt, or the leadCreatedAt is greater than the lastLeadAt, set the lastLeadAt to the leadCreatedAt
              lastLeadAt:
                leadCreatedAt > (acc[link.id]?.lastLeadAt ?? new Date(0))
                  ? leadCreatedAt
                  : acc[link.id]?.lastLeadAt,
            };
            return acc;
          },
          {} as Record<
            string,
            {
              clicks: number;
              leads: number;
              lastLeadAt: Date | undefined;
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
            clicks: {
              increment: stats.clicks,
            },
            leads: {
              increment: stats.leads,
            },
            lastLeadAt: stats.lastLeadAt,
          },
        });
        console.log(
          `Updated ${linkId} to ${res.clicks} clicks (+${stats.clicks} clicks), ${res.leads} leads (+${stats.leads} leads)`,
        );
      }
    },
  });
}

main();
