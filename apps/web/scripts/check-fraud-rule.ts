import { detectAndRecordPartnerFraud } from "@/lib/api/fraud/detect-record-partner-fraud";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  // await prisma.fraudEvent.create({
  //   data: {
  //     id: createId({ prefix: "fraud_" }),
  //     programId: "prog_1K2J9DRWPPJ2F1RX53N92TSGA",
  //     partnerId: "pn_1K9BZE1K2K6XHC2T5P5X9GN17",
  //     customerId: "cus_1K9WG32MAMWAASDZD2PFF3W1C",
  //     type: "referralSourceBanned"
  //   },
  // });

  const partner = await prisma.partner.findUniqueOrThrow({
    where: {
      id: "pn_1K9BZE1K2MBW809JBVC746SWH",
    },
  });

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: "prog_1K2J9DRWPPJ2F1RX53N92TSGA",
    },
  });

  await detectAndRecordPartnerFraud({
    context: {
      program,
      partner,
    },
  });
}

main();
