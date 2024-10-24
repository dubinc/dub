import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const linksWithUtms = await prisma.link.findMany({
    where: {
      OR: [
        { utm_source: { not: null } },
        { utm_campaign: { not: null } },
        { utm_medium: { not: null } },
        { utm_content: { not: null } },
        { utm_term: { not: null } },
      ],
    },
    select: {
      utm_source: true,
      utm_campaign: true,
      utm_medium: true,
      utm_content: true,
      utm_term: true,
    },
  });

  const linkUtms = linksWithUtms.map(
    (link) => Object.keys(link).filter((key) => link[key] !== null).length,
  );

  const totalUtms = linkUtms.reduce((acc, curr) => acc + curr, 0);

  const averageUtms = totalUtms / linkUtms.length;

  const groupByUtmCount = linkUtms.reduce((acc, curr) => {
    acc[curr] = (acc[curr] || 0) + 1;
    return acc;
  }, {});

  console.log({
    totalUtms,
    totalLinks: linkUtms.length,
    averageUtms,
    groupByUtmCount,
  });
}

main();
