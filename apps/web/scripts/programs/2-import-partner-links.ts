import { ProcessedLinkProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";
import { bulkCreateLinks } from "../../lib/api/links";

const programId = "prog_xxx";
const userId = "user_xxx";
type PartnerLinkData = {
  email: string;
  username: string;
};
const partnerLinksToImport: PartnerLinkData[] = [];

// script to import any additional partner links into a program via CSV file (run after 1-import-partners.ts)
async function main() {
  Papa.parse(fs.createReadStream("partner_links.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: { data: PartnerLinkData }) => {
      partnerLinksToImport.push(result.data);
    },
    complete: async () => {
      console.log(
        `Found ${partnerLinksToImport.length} partner links to import`,
      );

      const program = await prisma.program.findUniqueOrThrow({
        where: {
          id: programId,
        },
        include: {
          workspace: true,
          partners: {
            where: {
              partner: {
                email: {
                  in: partnerLinksToImport.map((link) => link.email),
                },
              },
            },
            select: {
              partner: true,
              tenantId: true,
            },
          },
        },
      });
      const partnerMap = new Map(
        program.partners.map(({ partner, tenantId }) => [
          partner.email,
          {
            id: partner.id,
            tenantId,
          },
        ]),
      );

      const finalPartnerLinksToImport = partnerLinksToImport
        .map((link) => {
          const partner = partnerMap.get(link.email);
          if (!partner) {
            return null;
          }
          return {
            domain: program.domain!,
            key: link.username,
            url: program.url!,
            trackConversion: true,
            programId,
            partnerId: partner.id,
            folderId: program.defaultFolderId,
            userId,
            projectId: program.workspaceId,
            tenantId: partner.tenantId,
          };
        })
        .filter(
          (p): p is NonNullable<typeof p> => p !== null,
        ) satisfies ProcessedLinkProps[];

      await bulkCreateLinks({
        links: finalPartnerLinksToImport,
        skipRedisCache: true,
      });
      console.log(`imported ${finalPartnerLinksToImport.length} partner links`);
    },
  });
}

main();
