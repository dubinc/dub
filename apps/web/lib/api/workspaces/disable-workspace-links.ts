import { prisma } from "@/lib/prisma";
import { linkCache } from "../links/cache";

export async function disableWorkspaceLinks(workspaceId: string) {
  let totalDisabledLinks = 0;

  while (true) {
    const linksToDisable = await prisma.link.findMany({
      where: {
        projectId: workspaceId,
        disabledAt: null,
      },
      take: 100,
    });
    if (linksToDisable.length === 0) {
      console.log("No more links to disable. Exiting...");
      break;
    }

    if (linksToDisable.length > 0) {
      const disabledLinks = await prisma.link.updateMany({
        where: {
          id: {
            in: linksToDisable.map((link) => link.id),
          },
        },
        data: {
          disabledAt: new Date(),
        },
      });
      totalDisabledLinks += disabledLinks.count;

      console.log(`Disabled ${disabledLinks.count} links`);

      await linkCache.expireMany(linksToDisable);
    }

    console.log(
      `Completed disabling ${totalDisabledLinks} links for workspace ${workspaceId}`,
    );
  }
}
