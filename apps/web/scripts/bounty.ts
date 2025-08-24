import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// TODO:
// Remove this
async function main() {
  const bountyId = "bnty_1K3BTNY5XCCZJT1RRYW8R6VVQ";
  const partnerIds = [
    "pn_1K33CAFZV1207H5XBR720XAK6",
    "pn_1K33CAFZV2NSRHVY098A0DSPP",
    "pn_1K33CAFZV9XKMBJFW23V1VEXP"
  ];

  await prisma.bountySubmission.createMany({
    data: partnerIds.map((partnerId) => ({
      id: createId({ prefix: "bnty_sub_" }),
      programId: "prog_1K2J9DRWPPJ2F1RX53N92TSGA",
      partnerId,
      bountyId,
    })),
  });
}

main();
