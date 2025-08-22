import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// TODO:
// Remove this
async function main() {
  await prisma.bountySubmission.create({
    data: {
      id: createId({ prefix: "bnty_sub_" }),
      programId: "prog_1K2J9DRWPPJ2F1RX53N92TSGA",
      partnerId: "pn_1K33CAFZV9XKMBJFW23V1VEXP",
      bountyId: "bnty_1K38BKWCB1CZYTCXAXYCDYKXQ",
    },
  });
}

main();
