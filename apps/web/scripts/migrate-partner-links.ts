import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const partners = await prisma.programEnrollment.findMany({
    where: {
      linkId: {
        not: null,
      },
    },
    select: {
      partnerId: true,
      programId: true,
      linkId: true,
    },
  });

  for (const { partnerId, linkId } of partners) {
    await prisma.link.update({
      where: {
        id: linkId!,
      },
      data: {
        partnerId,
      },
    });
  }

  console.log(partners);
}

main();
