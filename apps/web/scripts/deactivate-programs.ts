import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { deactivateProgram } from "../lib/api/programs/deactivate-program";

async function main() {
  const programs = await prisma.program.findMany({
    where: {
      deactivatedAt: null,
      workspace: {
        plan: {
          in: ["free", "pro"],
        },
      },
    },
    include: {
      workspace: true,
    },
  });

  console.log(`Found ${programs.length} programs to deactivate`);
  console.table(
    programs.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      plan: p.workspace.plan,
    })),
  );

  for (const program of programs) {
    await deactivateProgram(program.id);
  }
}

main();
