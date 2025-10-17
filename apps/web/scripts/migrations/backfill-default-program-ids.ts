import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const programs = await prisma.program.findMany();

  const data = await Promise.all(
    programs.map(async (program) => {
      return await prisma.project.update({
        where: { id: program.workspaceId },
        data: { defaultProgramId: program.id },
      });
    }),
  );

  console.table(data, ["slug", "plan", "stripeId", "defaultProgramId"]);
}

main();
