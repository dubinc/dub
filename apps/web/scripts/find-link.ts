import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

async function main() {
  const subdomains = await prisma.domain.findMany({
    where: {
      slug: {
        endsWith: ".dub.link",
      },
      project: {
        defaultProgramId: null,
        plan: "free",
      },
      links: {
        every: {
          key: "_root",
        },
      },
    },
    include: {
      project: true,
    },
  });
  console.log(`Found ${subdomains.length} subdomains.`);
  console.table(
    subdomains.map((subdomain) => ({
      slug: subdomain.slug,
      project: subdomain.project?.slug,
      plan: subdomain.project?.plan,
      hasStore: !!subdomain.project?.store,
    })),
  );

  // for (const subdomain of subdomains) {
  //   await markDomainAsDeleted({
  //     domain: subdomain.slug,
  //   });
  // }
}

main();
