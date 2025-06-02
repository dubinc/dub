import { prisma } from "@dub/prisma";
// import { resend, RESEND_AUDIENCES } from "@dub/email/resend";
import "dotenv-flow/config";

async function main() {
  const partnerUsers = await prisma.user.findMany({
    where: {
      partners: {
        some: {},
      },
      projects: {
        none: {},
      },
    },
  });

  console.log(`Found ${partnerUsers.length} partner users`);
}

main();
