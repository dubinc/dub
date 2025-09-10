import { createId } from "@/lib/api/create-id";
import { generateRandomName } from "@/lib/names";
import { determinePartnerReward } from "@/lib/partners/determine-partner-reward";
import { prisma } from "@dub/prisma";
import { EventType, Prisma } from "@dub/prisma/client";
import { capitalize, nanoid } from "@dub/utils";
import { COUNTRIES_TO_CONTINENTS } from "@dub/utils/src/constants/continents";
import { geolocation } from "@vercel/functions";
import "dotenv-flow/config";
import * as fs from "fs";
import { userAgent } from "next/server";
import * as Papa from "papaparse";

let leadsToBackfill: {
  customerExternalId: string;
  partnerLinkKey: string;
  country: string;
  timestamp: string;
}[] = [];

async function main() {
  Papa.parse(fs.createReadStream("perplexity_leads.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: {
      data: {
        CUSTOM_USER_ID: string;
        CAMPAIGN_NAME: string;
        COUNTRY: string;
        ADJUSTED_TIMESTAMP: string;
      };
    }) => {
      leadsToBackfill.push({
        customerExternalId: result.data.CUSTOM_USER_ID,
        partnerLinkKey: result.data.CAMPAIGN_NAME,
        country: result.data.COUNTRY,
        timestamp: result.data.ADJUSTED_TIMESTAMP,
      });
    },
    complete: async () => {
      console.log(`Found ${leadsToBackfill.length} leads to backfill`);

      const workspace = await prisma.project.findUniqueOrThrow({
        where: {
          id: "xxx",
        },
      });

      const partnerLinks = await prisma.link.findMany({
        where: {
          domain: "pplx.ai",
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
      //         conversions: {
      //           increment: stats.conversions,
      //         },
      //       },
      //     });
      //     console.log(
      //       `Updated ${linkId} to ${res.clicks} clicks (+${stats.clicks} clicks), ${res.leads} leads (+${stats.leads} leads), ${res.conversions} conversions (+${stats.conversions} conversions)`,
      //     );
      //   }

      const clicksToCreate = await Promise.all(
        leadsToBackfill.map(async (lead) => {
          const link = partnerLinks.find(
            (link) =>
              link.key.toLowerCase() === lead.partnerLinkKey.toLowerCase(),
          );
          if (!link) {
            return null;
          }
          const req = new Request(link.url, {
            headers: new Headers({
              "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
              "x-forwarded-for": "127.0.0.1",
              "x-vercel-ip-country": lead.country.toUpperCase(),
              "x-vercel-ip-continent":
                COUNTRIES_TO_CONTINENTS[lead.country.toUpperCase()],
            }),
          });

          const clickId = nanoid(16);
          const geo = geolocation(req);
          const ua = userAgent(req);

          return {
            timestamp: new Date(lead.timestamp).toISOString(),
            identity_hash: lead.customerExternalId,
            click_id: clickId,
            link_id: link.id,
            url: link.url,
            ip: "",
            continent: req.headers.get("x-vercel-ip-continent") || "",
            country: geo.country || "Unknown",
            region: "Unknown",
            city: geo.city || "Unknown",
            latitude: geo.latitude || "Unknown",
            longitude: geo.longitude || "Unknown",
            vercel_region: geo.region || "",
            device: capitalize(ua.device.type) || "Desktop",
            device_vendor: ua.device.vendor || "Unknown",
            device_model: ua.device.model || "Unknown",
            browser: ua.browser.name || "Unknown",
            browser_version: ua.browser.version || "Unknown",
            engine: ua.engine.name || "Unknown",
            engine_version: ua.engine.version || "Unknown",
            os: ua.os.name || "Unknown",
            os_version: ua.os.version || "Unknown",
            cpu_architecture: ua.cpu?.architecture || "Unknown",
            ua: ua.ua || "Unknown",
            bot: 0,
            qr: 0,
            referer: "(direct)",
            referer_url: "(direct)",
            trigger: "link",
          };
        }),
      ).then((res) => res.filter((r) => r !== null));

      const customersToCreate: Prisma.CustomerCreateManyInput[] =
        leadsToBackfill
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
              clickId: clickData.click_id,
              linkId: clickData.link_id,
              country: clickData.country,
              clickedAt: new Date(lead.timestamp).toISOString(),
              createdAt: new Date(lead.timestamp).toISOString(),
            };
          })
          .filter((c) => c !== null);

      const leadsToCreate = clicksToCreate.map((clickData, idx) => ({
        ...clickData,
        event_id: nanoid(16),
        event_name: "activated",
        customer_id: customersToCreate[idx]!.id,
      }));

      const leadReward = await prisma.reward.findUniqueOrThrow({
        where: {
          id: "rw_1K1KTWJPS14SEENXFHE0FYN7J",
        },
      });

      const commissionsToCreate = leadsToCreate
        .map((leadData) => {
          const reward = determinePartnerReward({
            event: EventType.lead,
            programEnrollment: {
              totalCommissions: 0,
              leadReward: leadReward,
            },
            context: {
              customer: {
                country: leadData.country,
              },
            },
          });

          if (!reward) {
            return null;
          }

          const link = partnerLinks.find(
            (link) => link.id === leadData.link_id,
          );

          if (!link) {
            console.log(`Link not found for lead ${leadData.event_id}`);
            return null;
          }

          return {
            id: createId({ prefix: "cm_" }),
            programId: link.programId!,
            partnerId: link.partnerId!,
            rewardId: reward.id,
            customerId: leadData.customer_id,
            linkId: link.id,
            eventId: leadData.event_id,
            quantity: 1,
            amount: 0,
            type: EventType.lead,
            earnings: reward.amount,
            createdAt: new Date(leadData.timestamp).toISOString(),
          };
        })
        .filter((c) => c !== null);

      const commissionByPartnerId = commissionsToCreate.reduce(
        (acc, c) => {
          acc[c.partnerId] = (acc[c.partnerId] || 0) + c.earnings;
          return acc;
        },
        {} as Record<string, number>,
      );

      //   for (const [partnerId, amount] of Object.entries(commissionByPartnerId)) {
      //     const res = await prisma.programEnrollment.update({
      //       where: {
      //         partnerId_programId: {
      //           partnerId,
      //           programId: workspace.defaultProgramId!,
      //         },
      //       },
      //       data: {
      //         totalCommissions: {
      //           increment: amount,
      //         },
      //       },
      //     });
      //     console.log(
      //       `Updated ${partnerId} to ${res.totalCommissions} total commissions (+${amount} commissions)`,
      //     );
      //   }

      const totalCommissionAmount = commissionsToCreate.reduce(
        (acc, c) => acc + c.earnings,
        0,
      );
      console.log(`Total commission amount: ${totalCommissionAmount}`);
    },
  });
}

main();
