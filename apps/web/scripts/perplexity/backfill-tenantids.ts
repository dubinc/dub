import { includeTags } from "@/lib/api/links/include-tags";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";
import { recordLink } from "../../lib/tinybird/record-link";

const programId = "prog_xxx";

let partnersToBackfill: {
  partnerId: string;
  tenantId: string;
}[] = [];

async function main() {
  Papa.parse(fs.createReadStream("pplx_partnerId_tenantId.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: {
      data: {
        PARTNERID: string;
        TENANTID: string;
      };
    }) => {
      if (result.data.PARTNERID && result.data.TENANTID) {
        partnersToBackfill.push({
          partnerId: result.data.PARTNERID,
          tenantId: result.data.TENANTID,
        });
      }
    },
    complete: async () => {
      //filter out partners that are already backfilled
      const alreadyBackfilledPartners = await prisma.programEnrollment.findMany(
        {
          where: {
            programId,
            tenantId: {
              not: null,
            },
          },
        },
      );
      const filteredPartnersToBackfill = partnersToBackfill.filter(
        (partner) =>
          !alreadyBackfilledPartners.some(
            (p) => p.partnerId === partner.partnerId,
          ),
      );

      console.log(
        `Found ${filteredPartnersToBackfill.length} partners to backfill`,
      );

      for (const partner of filteredPartnersToBackfill) {
        const where = {
          programId,
          partnerId: partner.partnerId,
        };

        const programEnrollment = await prisma.$transaction(async (tx) => {
          await tx.link.updateMany({
            where,
            data: {
              tenantId: partner.tenantId,
            },
          });
          return await tx.programEnrollment.update({
            where: {
              partnerId_programId: where,
            },
            data: {
              tenantId: partner.tenantId,
            },
            include: {
              links: {
                include: includeTags,
              },
            },
          });
        });

        console.log(
          `Updated ${partner.partnerId} and their ${programEnrollment.links.length} links with tenantId ${partner.tenantId}`,
        );

        const tbRes = await recordLink(programEnrollment.links);
        console.log("tbRes", tbRes);
      }
    },
  });
}

main();
