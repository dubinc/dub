import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// TODO:
// Remove this
async function main() {
  // const bounty = await prisma.bounty.create({
  //   data: {
  //     id: createId({ prefix: "bounty_" }),
  //     programId: "prog_1K21SX1XVES0B7PJCCSQ099ZF",
  //     name: "Very long name for a bounty that will be truncated after certain length",
  //     type: "submission",
  //     startsAt: new Date(),
  //     rewardAmount: 1000,
  //   },
  // });

  // console.log(bounty);

  const programId = "prog_1K21SX1XVES0B7PJCCSQ099ZF";
  const bountyId = "bounty_1K290RBGA500N6DR92TW2QVSV"

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      programId,
    },
  });

  // Create a submission for each partner
  const submissions = programEnrollments.map((enrollment) => ({
    programId,
    partnerId: enrollment.partnerId,
    bountyId,
    evidenceUrl: ""
  }));

  await prisma.bountySubmission.createMany({
    data: submissions,
  });
}

main();
