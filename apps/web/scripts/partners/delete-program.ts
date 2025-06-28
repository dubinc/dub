import { prisma } from "@dub/prisma";
import { R2_URL } from "@dub/utils";
import "dotenv-flow/config";
import { storage } from "../../lib/storage";

async function main() {
  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: "prog_1JWPV1GFN7K4XEYZHZ3DS5VTG",
    },
  });

  if (program.defaultFolderId) {
    const deletedFolder = await prisma.folder.delete({
      where: {
        id: program.defaultFolderId,
      },
    });

    console.log("Deleted folder", deletedFolder);
  }

  const deletedRewards = await prisma.reward.deleteMany({
    where: {
      programId: program.id,
    },
  });

  console.log("Deleted rewards", deletedRewards);

  if (program.logo) {
    const deletedLogo = await storage.delete(
      program.logo.replace(`${R2_URL}/`, ""),
    );

    console.log("Deleted logo", deletedLogo);
  }

  await prisma.project.update({
    where: {
      id: program.workspaceId,
    },
    data: {
      defaultProgramId: null,
    },
  });

  const deletedProgram = await prisma.program.delete({
    where: {
      id: program.id,
    },
  });

  console.log("Deleted program", deletedProgram);
}

main();
