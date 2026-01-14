import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const programId = "prog_1K2J9DRWPPJ2F1RX53N92TSGA";
  const partnerId = "pn_1KETZ919GKV2TM96EZEV4GDXT";

  await prisma.partnerReferral.createMany({
    data: [
      {
        id: createId({ prefix: "ref_" }),
        programId,
        partnerId,
        name: "John 1",
        company: "Acme 1",
        email: "john+1@dub.co",
      },
      {
        id: createId({ prefix: "ref_" }),
        programId,
        partnerId,
        name: "John 2",
        company: "Acme 2",
        email: "john+2@dub.co",
      },
      {
        id: createId({ prefix: "ref_" }),
        programId,
        partnerId,
        name: "John 3",
        company: "Acme 3",
        email: "john+3@dub.co",
      },
      {
        id: createId({ prefix: "ref_" }),
        programId,
        partnerId,
        name: "John 4",
        company: "Acme 4",
        email: "john+4@dub.co",
      },
      {
        id: createId({ prefix: "ref_" }),
        programId,
        partnerId,
        name: "John 5",
        company: "Acme 5",
        email: "john+5@dub.co",
      },
      {
        id: createId({ prefix: "ref_" }),
        programId,
        partnerId,
        name: "John 6",
        company: "Acme 6",
        email: "john+6@dub.co",
      },
    ],
  });

  //
}

main();
