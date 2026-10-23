import * as z from "zod/v4";
import { includeProgramEnrollment } from "../../api/links/include-program-enrollment";
import { includeTags } from "../../api/links/include-tags";
import { prisma } from "../../prisma";
import { recordLink } from "../../tinybird";
import { defineJob } from "../index";

const MAX_LINKS_PER_BATCH = 500;

const inputSchema = z.object({
  folderId: z.string(),
});

// Job to remove folderId from all links and delete the folder
export const folderDeletedJob = defineJob({
  name: "folder-deleted-job",
  schema: inputSchema,
  async handle(input) {
    const { folderId } = input;

    const folder = await prisma.folder.findUnique({
      where: {
        id: folderId,
      },
      select: {
        projectId: true,
      },
    });

    if (!folder) {
      console.error(
        `[folderDeletedJob] Folder ${folderId} not found. Skipping...`,
      );
      return;
    }

    if (folder.projectId !== "") {
      console.error(
        `[folderDeletedJob] Folder ${folderId} not marked for deletion. Skipping...`,
      );
      return;
    }

    const linksToUpdate = await prisma.link.findMany({
      where: {
        folderId,
      },
      take: MAX_LINKS_PER_BATCH,
      orderBy: {
        createdAt: "desc", // TODO we need to add [folderId, createdAt] index on Link table
      },
      include: {
        ...includeTags,
        ...includeProgramEnrollment,
      },
    });

    if (linksToUpdate.length > 0) {
      await recordLink(
        linksToUpdate.map((link) => ({
          ...link,
          folderId: null,
        })),
      );

      const { count } = await prisma.link.updateMany({
        where: {
          id: {
            in: linksToUpdate.map((link) => link.id),
          },
        },
        data: {
          folderId: null,
        },
      });

      console.log(
        `[folderDeletedJob] Updated ${count} links in folder ${folderId}.`,
      );
    }

    if (linksToUpdate.length === MAX_LINKS_PER_BATCH) {
      await folderDeletedJob.dispatch(
        {
          folderId,
        },
        {
          delay: 1,
          label: folderId,
        },
      );

      return;
    }

    await prisma.folder.delete({
      where: {
        id: folderId,
      },
    });

    console.log(`[folderDeletedJob] Folder ${folderId} deleted from database.`);
  },
});
