import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";
import { createAndEnrollPartner } from "../../lib/api/partners/create-and-enroll-partner";

const programId = "prog_xxx";
const userId = "user_xxx";
const groupId = "grp_xxx";
type PartnerData = {
  name: string;
  email: string;
  username: string;
  tenantId: string;
  enrolledAt: Date;
};
const partnersToImport: PartnerData[] = [];

// script to import partners into a program via CSV file
// NOTE: Remove "server-only" and Axiom logging from handleApiError before running this script
async function main() {
  Papa.parse(fs.createReadStream("partners.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: { data: PartnerData }) => {
      partnersToImport.push(result.data);
    },
    complete: async () => {
      console.log(`Found ${partnersToImport.length} partners to import`);

      const program = await prisma.program.findUniqueOrThrow({
        where: {
          id: programId,
        },
        include: {
          workspace: true,
          partners: {
            include: {
              partner: true,
            },
          },
        },
      });

      const finalPartnersToImport = partnersToImport.filter(
        (partner) =>
          !program.partners.some((p) => p.partner.email === partner.email),
      );
      console.log(
        `Found ${finalPartnersToImport.length} final partners to import`,
      );

      for (const partner of finalPartnersToImport) {
        const enrolledPartner = await createAndEnrollPartner({
          workspace: {
            id: program.workspace.id,
            plan: program.workspace.plan as "advanced",
            webhookEnabled: program.workspace.webhookEnabled,
          },
          program,
          partner: {
            name: partner.name,
            email: partner.email,
            username: partner.username,
            tenantId: partner.tenantId,
            groupId,
          },
          enrolledAt: partner.enrolledAt,
          userId,
        });

        console.log(
          `Created and enrolled partner ${enrolledPartner.email} with link ${enrolledPartner?.links?.[0]?.shortLink}`,
        );
      }
    },
  });
}

main();
