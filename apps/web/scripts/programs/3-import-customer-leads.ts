import { createId } from "@/lib/api/create-id";
import { generateRandomName } from "@/lib/names";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { chunk, nanoid, prettyPrint } from "@dub/utils";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";
import { syncPartnerLinksStats } from "../../lib/api/partners/sync-partner-links-stats";
import { recordLeadWithTimestamp } from "../../lib/tinybird/record-lead";

const programId = "prog_xxx";
type CustomerData = {
  customerExternalId: string;
  partnerLinkKey: string;
  stripeCustomerId?: string;
  timestamp: string;
};
const leadsToBackfill: CustomerData[] = [];

// script to backfill customers + leads
// we also use a batching logic for tinybird events ingestion
async function main() {
  Papa.parse(fs.createReadStream("customers.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: { data: CustomerData }) => {
      leadsToBackfill.push(result.data);
    },
    complete: async () => {
      console.table(leadsToBackfill);
      const program = await prisma.program.findUniqueOrThrow({
        where: {
          id: programId,
        },
        include: {
          workspace: true,
        },
      });
      const { workspace } = program;

      const partnerLinks = await prisma.link.findMany({
        where: {
          domain: program.domain!,
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
            workspace_id: workspace.id,
            link_id: link.id,
            domain: link.domain,
            key: link.key,
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
        .filter((p): p is NonNullable<typeof p> => p !== null);

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
        .filter(
          (p): p is NonNullable<typeof p> => p !== null,
        ) satisfies Prisma.CustomerCreateManyInput[];

      console.table(customersToCreate.slice(0, 10));

      const customerRes = await prisma.customer.createMany({
        data: customersToCreate,
        skipDuplicates: true,
      });
      console.log("backfilled customers", prettyPrint(customerRes));

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
        console.log("backfilled leads", prettyPrint(leadRes));
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
            const syncRes = await syncPartnerLinksStats({
              partnerId: res.partnerId!,
              programId: program.id,
              eventType: "lead",
            });
            console.log("synced stats", prettyPrint(syncRes));
          }),
        );
      }
    },
  });
}

main();
