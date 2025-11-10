import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { includeTags } from "@/lib/api/links/include-tags";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { recordLink } from "../lib/tinybird";

const programId = "prog_xxx";

async function main() {
  const links = await prisma.link.findMany({
    where: {
      programId,
    },
    include: {
      ...includeTags,
      ...includeProgramEnrollment,
    },
  });

  console.log(`Found ${links.length} links to delete`);
  console.table(links.slice(-10), ["domain", "key"]);

  const response = await recordLink(links, { deleted: true });

  console.log("Deleted links in Tinybird", response);

  const deletedLinks = await prisma.link.deleteMany({
    where: {
      id: {
        in: links.map((link) => link.id),
      },
    },
  });

  console.log(`Deleted ${deletedLinks.count} links`);
}

main();
