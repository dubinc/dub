import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// update commissions for a program
async function main() {
  const programApplications = await prisma.programApplication.findMany({
    where: {
      programId: "prog_xxx",
      enrollment: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  console.log(`Found ${programApplications.length} applications`);
  console.table(programApplications);
}

main();
