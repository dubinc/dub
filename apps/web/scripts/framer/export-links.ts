import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

async function main() {
  const links = await prisma.link.findMany({
    where: {
      programId: "prog_qGGSH0jXFZLeogOnq1sLkriY",
      partnerId: {
        not: null,
      },
    },
    select: {
      key: true,
      partnerId: true,
    },
  });

  console.log(`Found ${links.length} links`);

  fs.writeFileSync(
    "framer_partner_links.csv",
    Papa.unparse(
      links.map((link) => ({
        via: link.key,
        parnter_id: link.partnerId,
      })),
    ),
  );
}

main();
