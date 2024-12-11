import { storage } from "@/lib/storage";
import { prisma } from "@dub/prisma";
import { truncate } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const imagesToMigrate = await prisma.link.findMany({
    where: {
      proxy: true,
      image: {
        startsWith: "https://res.cloudinary.com",
      },
    },
    select: {
      id: true,
      image: true,
    },
    take: 30,
  });

  const res = await Promise.allSettled(
    imagesToMigrate.map(async (link) => {
      try {
        const { url } = await storage.upload(
          `images/${link.id}`,
          link.image!, // this exists since we're filtering above
          {
            width: 1200,
            height: 630,
          },
        );

        await prisma.link.update({
          where: {
            id: link.id,
          },
          data: {
            image: url,
          },
        });

        return {
          url,
          original: truncate(link.image, 80),
        };
      } catch (e) {
        if (e.message === "Failed to fetch URL: Not Found") {
          // double check if it's actually 404
          const res = await fetch(link.image!);
          if (res.status === 404) {
            console.log(`Image deleted: ${link.image}`);
            await prisma.link.update({
              where: {
                id: link.id,
              },
              data: {
                image: null,
              },
            });
          }
        }
        return {
          url: "deleted: " + link.id,
          original: truncate(link.image, 80),
        };
      }
    }),
  ).then((res) =>
    res.map((r) => {
      if (r.status === "fulfilled") {
        return r.value;
      } else {
        return r.reason;
      }
    }),
  );

  console.table(res);

  // TODO: migrate project logos
  // TODO: migrate user avatars
}

main();
