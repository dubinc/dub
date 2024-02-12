import prisma from "@/lib/prisma";
import "dotenv-flow/config";

async function main() {
  const users = await prisma.link.updateMany({
    where: {
      projectId: "xxx",
    },
    data: {
      userId: "xxx",
    },
  });
  console.log(users);
}

main();
