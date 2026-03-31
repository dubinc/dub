import { partnerProfileChangeHistoryLogSchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

const programId = "prog_xxx";

async function main() {
  const partners = await prisma.partner.findMany({
    where: {
      programs: {
        some: {
          programId,
          status: "approved",
        },
      },
      country: {
        not: "US",
      },
      changeHistoryLog: {
        path: "$[*].from",
        array_contains: "US",
      },
      commissions: {
        some: {
          programId,
          status: {
            in: ["pending", "processed"],
          },
        },
      },
    },
    include: {
      commissions: {
        where: {
          programId,
          status: {
            in: ["pending", "processed"],
          },
        },
      },
    },
  });

  const finalPartners = partners.map((p) => {
    const changeHistoryLog = partnerProfileChangeHistoryLogSchema.parse(
      p.changeHistoryLog,
    );
    const finalCountryChange = changeHistoryLog
      .filter((ch) => ch.field === "country") // filter by country field
      .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime())[0]; // sort by changedAt descending
    return {
      id: p.id,
      email: p.email,
      pendingCommissions: p.commissions.reduce(
        (acc, commission) => acc + commission.earnings,
        0,
      ),
      changedFrom: finalCountryChange?.from,
      changedTo: finalCountryChange?.to,
      currentCountry: p.country,
      changedAt: finalCountryChange?.changedAt,
    };
  });

  console.table(finalPartners);

  fs.writeFileSync("output.csv", Papa.unparse(finalPartners));
}

main();
