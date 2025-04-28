import { prisma } from "@dub/prisma";
import { R2_URL } from "@dub/utils";
import "dotenv-flow/config";
import { storage } from "../../lib/storage";

async function main() {
  const program = await prisma.program.update({
    where: {
      id: "prog_1JSF1XA6SP6KFW5F15FY3HCMG",
    },
    data: {
      defaultRewardId: null,
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

  const deletedProgram = await prisma.program.delete({
    where: {
      id: program.id,
    },
  });

  console.log("Deleted program", deletedProgram);
}

main();
