import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";
import { includeTags } from "../../lib/api/links/include-tags";
import { createAndEnrollPartner } from "../../lib/api/partners/create-and-enroll-partner";
import { recordLink } from "../../lib/tinybird/record-link";

interface BackfillLinkProp {
  externalId: string;
  key: string;
  name: string;
  email: string;
  avatar?: string;
}

const linksToBackfill: BackfillLinkProp[] = [];

async function main() {
  Papa.parse(fs.createReadStream("refer_cal_links_backfilled.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: { data: BackfillLinkProp }) => {
      linksToBackfill.push(result.data);
    },
    complete: async () => {
      const batch = linksToBackfill.slice(0, 50);

      const program = await prisma.program.findUniqueOrThrow({
        where: {
          id: "prog_mODHMDrJPWlkpT7uzsUASFhK",
        },
      });

      const finalResults: {
        name: string;
        email: string;
        clicks: number;
        leads: number;
        sales: number;
      }[] = [];

      await Promise.all(
        batch.map(async (l) => {
          const link = await prisma.link.findUnique({
            where: {
              domain_key: {
                domain: "refer.cal.com",
                key: l.key,
              },
            },
          });

          if (!link) {
            console.log("Link not found", l.email);
            return;
          }

          if (link.partnerId) {
            console.log("Partner already enrolled", l.email);
            return;
          }

          try {
            const res = await createAndEnrollPartner({
              program,
              workspace: {
                id: program.workspaceId,
                webhookEnabled: false,
              },
              link,
              tenantId: l.externalId,
              partner: {
                name: l.name,
                email: l.email,
                image: l.avatar && l.avatar.length < 190 ? l.avatar : undefined,
              },
              skipEnrollmentCheck: true,
            });

            finalResults.push({
              name: res.name,
              email: res.email ?? "",
              clicks: res.clicks,
              leads: res.leads,
              sales: res.sales,
            });

            // remove row from csv
            linksToBackfill.splice(linksToBackfill.indexOf(l), 1);
            fs.writeFileSync(
              "refer_cal_links_backfilled.csv",
              Papa.unparse(linksToBackfill),
              "utf-8",
            );
          } catch (e) {
            if (e.message.includes("already enrolled")) {
              const partner = await prisma.partner.update({
                where: {
                  email: l.email,
                },
                data: {
                  name: l.name,
                  image: l.avatar ?? undefined,
                },
              });

              await prisma.link
                .update({
                  where: {
                    id: link.id,
                  },
                  data: {
                    programId: program.id,
                    partnerId: partner.id,
                    tenantId: l.externalId,
                    folderId: program.defaultFolderId,
                    trackConversion: true,
                  },
                  include: includeTags,
                })
                .then((link) => recordLink(link));
            } else {
              console.error(e, l.email);
            }
          }
        }),
      );

      console.table(finalResults);
    },
  });
}

main();
