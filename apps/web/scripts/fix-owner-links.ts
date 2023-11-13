import "dotenv-flow/config";
import prisma from "@/lib/prisma";

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
