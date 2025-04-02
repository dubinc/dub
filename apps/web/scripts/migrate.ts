import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

const DOMAIN = "x.com";
const PROJECT_ID = "xxx";

async function main() {
  const response = await prisma.project.findMany({
    where: {
      id: {
        not: {
          startsWith: "c",
        },
      },
    },
  });
  console.log({ response });
}

main();
