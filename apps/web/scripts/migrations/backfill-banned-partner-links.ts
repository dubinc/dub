import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { includeTags } from "@/lib/api/links/include-tags";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { recordLink } from "../../lib/tinybird/record-link";

async function main() {
  // Find links for partners that were banned
  const links = await prisma.link.findMany({
    where: {
      programEnrollment: {
        status: "banned",
      },
    },
    include: {
      ...includeTags,
      ...includeProgramEnrollment,
    },
    orderBy: {
      id: "asc",
    },
    skip: 1500,
    take: 500,
  });

  if (links.length === 0) {
    return;
  }

  console.log(`Found ${links.length} links to process.`);
  const prismaRes = await prisma.link.updateMany({
    where: {
      id: {
        in: links.map((link) => link.id),
      },
    },
    data: {
      disabledAt: new Date(),
    },
  });
  console.log(`Updated ${prismaRes.count} links to be disabled.`);

  const tbRes = await recordLink(links, {
    deleted: true,
  });

  console.log("Deleted links in Tinybird", tbRes);
}

main();
