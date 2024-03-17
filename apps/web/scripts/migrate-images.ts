import prisma from "@/lib/prisma";
import { storage } from "@/lib/storage";
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
    take: 10,
  });

  const res = await Promise.all(
    imagesToMigrate.map(async (link) => {
      const uploadedImage = await storage.upload(
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
          image: uploadedImage.url,
        },
      });

      return uploadedImage;
    }),
  );

  console.table(res);

  // TODO: migrate project logos
  // TODO: migrate user avatars
}

main();
