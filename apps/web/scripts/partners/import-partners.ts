import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";
import { createAndEnrollPartner } from "../../lib/api/partners/create-and-enroll-partner";
import { createPartnerLink } from "../../lib/api/partners/create-partner-link";

const programId = "xxx";
const userId = "xxx";
const partnersToImport: { email: string; slug: string; enrolledAt: Date }[] =
  [];

async function main() {
  Papa.parse(fs.createReadStream("affiliates.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: {
      data: { payment_email?: string; date_registered: string };
    }) => {
      const email = result.data.payment_email;
      if (!email) {
        return;
      }

      let slug = slugify(email.split("@")[0]);
      // check if slug is already used by another partner in partnersToImport
      while (partnersToImport.some((partner) => partner.slug === slug)) {
        slug = `${slug}-${nanoid(4).toLowerCase()}`;
      }

      partnersToImport.push({
        email,
        slug,
        enrolledAt: new Date(result.data.date_registered),
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
          enrolledAt: partner.enrolledAt,
        });

        console.log(
          `Created and enrolled partner ${enrolledPartner.email} with link ${enrolledPartner?.links?.[0]?.shortLink}`,
        );
      }
    },
  });
}

main();
