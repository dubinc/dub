import { prisma } from "@dub/prisma";
import { INFINITY_NUMBER } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const business = await prisma.project.updateMany({
    where: {
      plan: {
        in: ["business", "business plus", "business extra", "business max"],
      },
    },
    data: { partnerTagsLimit: 10 },
  });

  const advancedEnterprise = await prisma.project.updateMany({
    where: { plan: { in: ["advanced", "enterprise"] } },
    data: { partnerTagsLimit: INFINITY_NUMBER },
  });

  console.table({ business, advancedEnterprise });
}

main();
