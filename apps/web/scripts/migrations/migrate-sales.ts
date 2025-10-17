import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import { EventType } from "@dub/prisma/client";
import "dotenv-flow/config";

async function main() {
  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: "prog_1K2J9DRWPPJ2F1RX53N92TSGA",
    },
  });

  const link = await prisma.link.findUnique({
    where: {
      domain_key: {
        domain: program.domain!,
        key: "BESTPIC",
      },
    },
  });

  console.log(link)
}

main();
