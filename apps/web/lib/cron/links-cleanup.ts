import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { APP_DOMAIN_WITH_NGROK, R2_URL } from "@dub/utils";
import { storage } from "../storage";
import { qstash } from "./index";

export const initiateLinkCleanupJob = async () => {
  await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/cleanup`,
  });
};

export const cleanupLinks = async () => {
  const links = await prisma.link.findMany({
    where: {
      projectId: null,
    },
    select: {
      id: true,
      domain: true,
      key: true,
      url: true,
      image: true,
    },
    take: 1, // TODO: Adjust this value
  });

  if (links.length === 0) {
    return;
  }

  // Filter images that need to be deleted from R2 storage
  const imagesToDelete = links.filter((link) =>
    link.image?.startsWith(`${R2_URL}/images/${link.id}`),
  );

  // Prepare Redis pipeline to batch delete link keys
  const pipeline = redis.pipeline();
  links.map((link) => pipeline.del(`${link.domain}:${link.key}`.toLowerCase()));

  try {
    await Promise.all([
      // Remove image from R2
      ...imagesToDelete.map((link) =>
        storage.delete(link.image!.replace(`${R2_URL}/`, "")),
      ),

      // Execute Redis pipeline to delete keys
      pipeline.exec(),

      // Remove the links from MySQL
      prisma.link.deleteMany({
        where: {
          id: {
            in: links.map((link) => link.id),
          },
        },
      }),
    ]);

    console.log(`Deleted ${links.length} links.`);
  } catch (error) {
    console.error("Error during link cleanup:", error);
  }
};
