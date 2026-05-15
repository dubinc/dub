import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

const programId = "prog_xxx";
const emails = ["email1@example.com", "email2@example.com"];

async function main() {
  for (const email of emails) {
    const partner = await prisma.partner.findUniqueOrThrow({
      where: {
        email: email,
      },
    });

    await prisma.discoveredPartner.upsert({
      where: {
        programId_partnerId: {
          programId,
          partnerId: partner.id,
        },
      },
      create: {
        id: createId({ prefix: "dpn_" }),
        partnerId: partner.id,
        programId,
        starredAt: new Date(),
      },
      update: {
        starredAt: new Date(),
      },
    });

    console.log(`Starred partner ${partner.name} for program ${programId}`);
  }
}

main();
