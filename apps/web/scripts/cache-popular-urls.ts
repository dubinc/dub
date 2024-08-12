import { prisma } from "@dub/prisma";
import { getApexDomain } from "@dub/utils";
import "dotenv-flow/config";
import * as fs from "fs";

async function main() {
  const links = await prisma.link.findMany({
    where: {
      domain: "dub.sh",
    },
    select: {
      url: true,
    },
  });

  const apexDomains = links.map(({ url }) => {
    return getApexDomain(url);
  });

  // array of apex domains with their count of occurrences
  const apexDomainsWithCount = apexDomains.reduce((acc, domain) => {
    if (!domain) {
      return acc;
    }
    acc[domain] = (acc[domain] || 0) + 1;
    return acc;
  }, {});

  // sort apex domains by count of occurrences
  const sortedApexDomains = Object.keys(apexDomainsWithCount).sort(
    (a, b) => apexDomainsWithCount[b] - apexDomainsWithCount[a],
  );

  const topApexDomains = sortedApexDomains.slice(0, 100).map((domain) => {
    return {
      domain,
      count: apexDomainsWithCount[domain],
    };
  });

  console.table(topApexDomains);

  // apex domains with count of occurrences >= 5

  const popularApexDomains = sortedApexDomains.filter(
    (domain) => apexDomainsWithCount[domain] >= 5,
  );

  console.log({
    allApexDomains: sortedApexDomains.length,
    popularApexDomains: popularApexDomains.length,
  });

  fs.writeFileSync(
    "popular-domains.json",
    JSON.stringify(popularApexDomains, null, 2),
  );
}

main();
