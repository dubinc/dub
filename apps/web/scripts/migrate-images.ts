import prisma from "@/lib/prisma";
import "dotenv-flow/config";

async function main() {
  const linksToMigrate = await prisma.link.findMany({
    where: {
      proxy: true,
      image: {
        startsWith: "https://res.cloudinary.com/",
      },
    },
    select: {
      id: true,
      domain: true,
      key: true,
      proxy: true,
      image: true,
    },
  });

  console.log(`Found ${linksToMigrate.length} links to migrate`);
  console.table(linksToMigrate.slice(0, 100));
}

main();
