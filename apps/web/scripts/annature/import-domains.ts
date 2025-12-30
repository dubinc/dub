import { createId } from "@/lib/api/create-id";
import { addDomainToVercel } from "@/lib/api/domains/add-domain-vercel";
import { configureVercelNameservers } from "@/lib/api/domains/configure-vercel-nameservers";
import { prisma } from "@dub/prisma";
import { linkConstructorSimple } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const projectId = "xxx";
  const userId = "xxx";
  const domainList = [];

  const domains = await prisma.domain.createMany({
    data: domainList.map((d) => ({
      id: createId({ prefix: "dom_" }),
      slug: d,
      projectId,
    })),
    skipDuplicates: true,
  });

  console.log(`Created ${domains.count} domains`);

  const createdDomains = await prisma.domain.findMany({
    where: {
      slug: {
        in: domainList,
      },
    },
  });

  const registeredDomains = await prisma.registeredDomain.createMany({
    data: domainList.map((d) => ({
      slug: d,
      projectId,
      domainId: createdDomains.find((cd) => cd.slug === d)?.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 year from now
    })),
    skipDuplicates: true,
  });

  console.log({ registeredDomains });

  const links = await prisma.link.createMany({
    data: domainList.map((d) => ({
      id: createId({ prefix: "link_" }),
      domain: d,
      key: "_root",
      url: "",
      shortLink: linkConstructorSimple({ domain: d, key: "_root" }),
      userId,
      projectId,
    })),
    skipDuplicates: true,
  });

  console.log(`Created ${links.count} links`);

  //   const tbLinks = await prisma.link.findMany({
  //     where: {
  //       domain: {
  //         in: domainList,
  //       },
  //     },
  //   });

  //   const tbResponse = await recordLink(tbLinks);

  //   console.log({ tbResponse });

  await Promise.all(
    domainList.slice(100, 125).map(async (d) => {
      const addRes = await addDomainToVercel(d);
      console.log({ addRes });
      const nsRes = await configureVercelNameservers(d);
      console.log({ nsRes });
    }),
  );
}

main();
