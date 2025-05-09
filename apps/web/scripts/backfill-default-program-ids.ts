import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const programs = await prisma.program.findMany();

  await Promise.all(
    programs.map(async (program) => {
      await prisma.project.update({
        where: { id: program.workspaceId },
        data: { defaultProgramId: program.id },
      });
    }),
  );
}

main();
