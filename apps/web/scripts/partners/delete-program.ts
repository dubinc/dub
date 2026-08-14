import { prisma } from "@/lib/prisma";
import { R2_URL } from "@dub/utils";
import "dotenv-flow/config";
import { workspaceProductCache } from "../../lib/api/workspaces/workspace-product-cache";
import { storage } from "../../lib/storage";

async function main() {
  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: "prog_xxx",
    },
    include: {
      workspace: true,
    },
  });

  await prisma.$transaction(
    async (tx) => {
      const deletedCommissions = await tx.commission.deleteMany({
        where: {
          programId: program.id,
        },
      });
      console.log("Deleted commissions", deletedCommissions);

      const deletedPayouts = await tx.payout.deleteMany({
        where: {
          programId: program.id,
        },
      });
      console.log("Deleted payouts", deletedPayouts);

      const deletedRewards = await tx.reward.deleteMany({
        where: {
          programId: program.id,
        },
      });
      console.log("Deleted rewards", deletedRewards);

      const deletedDiscounts = await tx.discount.deleteMany({
        where: {
          programId: program.id,
        },
      });

      console.log("Deleted discounts", deletedDiscounts);

      const deletedPartnerGroups = await tx.partnerGroup.deleteMany({
        where: {
          programId: program.id,
        },
      });
      console.log("Deleted partner groups", deletedPartnerGroups);

      const deletedProgramEnrollments = await tx.programEnrollment.deleteMany({
        where: {
          programId: program.id,
        },
      });
      console.log("Deleted program enrollments", deletedProgramEnrollments);

      const deletedFolder = await tx.folder.delete({
        where: {
          id: program.defaultFolderId,
        },
      });
      console.log("Deleted folder", deletedFolder);

      const updatedLinks = await tx.link.updateMany({
        where: {
          programId: program.id,
        },
        data: {
          programId: null,
        },
      });
      console.log("Updated links", updatedLinks);

      const updatedProject = await tx.project.update({
        where: {
          id: program.workspaceId,
        },
        data: {
          defaultProduct: "links",
          defaultProgramId: null,
        },
      });
      console.log("Updated project", updatedProject);
    },
    {
      maxWait: 10000, // default: 2000
      timeout: 20000, // default: 5000
    },
  );

  await workspaceProductCache.set({
    slug: program.workspace.slug,
    product: "links",
  });

  if (program.logo) {
    const deletedLogo = await storage.delete({
      key: program.logo.replace(`${R2_URL}/`, ""),
    });

    console.log("Deleted logo", deletedLogo);
  }
}

main();
