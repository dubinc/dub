import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";
import { createAndEnrollPartner } from "../../lib/api/partners/create-and-enroll-partner";

const programId = "prog_xxx";
const userId = "xxx";
const groupId = "grp_xxx";
const partnersToImport: {
  name: string;
  email: string;
  username: string;
  tenantId: string;
  enrolledAt: Date;
}[] = [];

async function main() {
  Papa.parse(fs.createReadStream("partners.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: {
      data: {
        userId: string;
        referral: string;
        firstName: string;
        lastName: string;
        email: string;
        createdAt: string;
      };
    }) => {
      partnersToImport.push({
        name: result.data.firstName + " " + result.data.lastName,
        email: result.data.email,
        username: result.data.referral,
        tenantId: result.data.userId,
        enrolledAt: new Date(result.data.createdAt),
      });
    },
    complete: async () => {
      console.table(partnersToImport);
      const program = await prisma.program.findUniqueOrThrow({
        where: {
          id: programId,
        },
        include: {
          workspace: true,
        },
      });

      for (const partner of partnersToImport) {
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
