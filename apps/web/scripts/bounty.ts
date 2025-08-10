import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const bounty = await prisma.bounty.create({
    data: {
      id: createId({ prefix: "bounty_" }),
      programId: "prog_1K21SX1XVES0B7PJCCSQ099ZF",
      name: "Very long name for a bounty that will be truncated after certain length",
      type: "submission",
      startsAt: new Date(),
      // endsAt: new Date(),
      rewardAmount: 1000,
    },
  });

  console.log(bounty);
}

main();
