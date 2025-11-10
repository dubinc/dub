import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { includeTags } from "@/lib/api/links/include-tags";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { recordLink } from "../lib/tinybird";

async function main() {
  const linksToUpdate = await prisma.link.findMany({
    where: {
      programId: "prog_xxx",
      partnerId: "pn_xxx",
    },
  });

  console.log(`Found ${linksToUpdate.length} links to update`);
  console.table(linksToUpdate.slice(-10), ["domain", "key"]);

  const res = await prisma.link.updateMany({
    where: {
      id: {
        in: linksToUpdate.map((link) => link.id),
      },
    },
    data: {
      tenantId: "xxx",
    },
  });

  console.log(res);

  const updatedLinks = await prisma.link.findMany({
    where: {
      id: {
        in: linksToUpdate.map((link) => link.id),
      },
    },
    include: {
      ...includeTags,
      ...includeProgramEnrollment,
    },
  });

  const tbRes = await recordLink(updatedLinks);
  console.log(tbRes);
}

main();
