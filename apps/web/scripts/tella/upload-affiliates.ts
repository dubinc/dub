import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";
import { createAndEnrollPartner } from "../../lib/api/partners/create-and-enroll-partner";
import { createPartnerLink } from "../../lib/api/partners/create-partner-link";

const programId = "xxx";
const userId = "xxx";
const partnersToImport: { email: string; slug: string }[] = [];

async function main() {
  Papa.parse(fs.createReadStream("tella-import-affiliates.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: { data: { email: string; slug: string } }) => {
      partnersToImport.push({
        email: result.data.email,
        slug: result.data.slug.slice(1),
      });
    },
    complete: async () => {
      const program = await prisma.program.findUniqueOrThrow({
        where: {
          id: programId,
        },
        include: {
          workspace: true,
        },
      });

      for (const partner of partnersToImport) {
        const partnerToCreate = {
          name: partner.email.split("@")[0],
          email: partner.email,
          username: partner.slug,
        };

        const partnerLink = await createPartnerLink({
          workspace: {
            id: program.workspace.id,
            plan: program.workspace.plan as "advanced",
            webhookEnabled: program.workspace.webhookEnabled,
          },
          program: {
            id: programId,
            domain: program.domain,
            url: program.url,
            defaultFolderId: program.defaultFolderId,
          },
          partner: partnerToCreate,
          userId,
        });

        const enrolledPartner = await createAndEnrollPartner({
          program,
          link: partnerLink,
          workspace: program.workspace,
          partner: partnerToCreate,
        });

        console.log(enrolledPartner);
      }
    },
  });
}

main();
