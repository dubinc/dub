import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

// update commissions for a program
async function main() {
  const partners = await prisma.programEnrollment
    .findMany({
      where: {
        programId: "prog_xxx",
        status: "approved",
      },
      select: {
        partner: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })
    .then((partners) => partners.map(({ partner }) => partner));

  fs.writeFileSync("tella_partners.csv", Papa.unparse(partners));
}

main();
