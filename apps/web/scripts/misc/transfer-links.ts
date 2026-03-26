import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { linkCache } from "../../lib/api/links/cache";
import { includeTags } from "../../lib/api/links/include-tags";
import { recordLink } from "../../lib/tinybird";

// script to transfer links from one workspace to another
async function main() {
  const oldWorkspaceId = "ws_xxx";
  const newWorkspaceId = "ws_xxx";

  const updatedDomains = await prisma.domain.updateMany({
    where: {
      projectId: oldWorkspaceId,
    },
    data: {
      projectId: newWorkspaceId,
    },
  });

  console.log(`Updated ${updatedDomains.count} domains`);

  const updatedRegisteredDomains = await prisma.registeredDomain.updateMany({
    where: {
      projectId: oldWorkspaceId,
    },
    data: {
      projectId: newWorkspaceId,
    },
  });
  console.log(`Updated ${updatedRegisteredDomains.count} registered domains`);

  const updatedTags = await prisma.tag.updateMany({
    where: {
      projectId: oldWorkspaceId,
    },
    data: {
      projectId: newWorkspaceId,
    },
  });

  console.log(`Updated ${updatedTags.count} tags`);

  const linksToUpdate = await prisma.link.findMany({
    where: {
      projectId: oldWorkspaceId,
    },
  });

  if (linksToUpdate.length > 0) {
    const updatedLinks = await prisma.link.updateMany({
      where: {
        id: {
          in: linksToUpdate.map((link) => link.id),
        },
      },
      data: {
        projectId: newWorkspaceId,
        folderId: null,
        disabledAt: null,
      },
    });

    console.log(`Updated ${updatedLinks.count} links`);

    const finalLinks = await prisma.link.findMany({
      where: {
        id: {
          in: linksToUpdate.map((link) => link.id),
        },
      },
      include: includeTags,
    });

    const redisRes = await linkCache.expireMany(finalLinks);

    // set the link with the old workspace ID to be deleted in Tinybird
    const tbRes1 = await recordLink(linksToUpdate, { deleted: true });

    // set the link with the new workspace ID to be created in Tinybird
    const tbRes2 = await recordLink(finalLinks);

    console.log("redisRes", redisRes);
    console.log("tbRes1", tbRes1);
    console.log("tbRes2", tbRes2);
  }
}

main();
