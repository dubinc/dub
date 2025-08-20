import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// TODO:
// Remove this
async function main() {
  const programId = "prog_1K2J9DRWPPJ2F1RX53N92TSGA";
  const bountyId = "bounty_1K33NYERM0XZS1HK7C82C77K0";

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      programId,
    },
    take: 5
  });

  // Create a submission for each partner
  const submissions = programEnrollments.map(({ partnerId }) => ({
    programId,
    partnerId,
    bountyId,
  }));

  await prisma.bountySubmission.createMany({
    data: submissions,
  });
}

main();
