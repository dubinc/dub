import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const CHUNK_SIZE = 50000;
  const domainCounts: { [domain: string]: number } = {};
  let totalUsers = 0;
  let skip = 0;

  console.log("Processing users in chunks of 50K...");

  while (true) {
    const users = await prisma.user.findMany({
      select: {
        email: true,
        name: true,
        createdAt: true,
      },
      skip,
      take: CHUNK_SIZE,
    });

    if (users.length === 0) break;

    totalUsers += users.length;
    console.log(
      `Processing chunk: ${skip + 1} to ${skip + users.length} (${users.length} users)`,
    );

    // Extract email domains and count them
    users.forEach((user) => {
      if (user.email) {
        const domain = user.email.split("@")[1]?.toLowerCase();
        if (domain) {
          domainCounts[domain] = (domainCounts[domain] || 0) + 1;
        }
      }
    });

    skip += CHUNK_SIZE;
  }

  console.log(`\nTotal users processed: ${totalUsers}`);

  // Convert to array and sort by count (descending)
  const topDomains = Object.entries(domainCounts)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count);

  console.log("\nTop 20 Email Domains:");
  console.log("Domain".padEnd(30), "Count");
  console.log("-".repeat(40));

  topDomains.slice(0, 20).forEach(({ domain, count }, index) => {
    console.log(
      `${(index + 1).toString().padStart(2)}. ${domain.padEnd(28)} ${count}`,
    );
  });
}

main();
