import { prisma } from "@dub/prisma";
import { LEGAL_USER_ID, LEGAL_WORKSPACE_ID } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const topDomains = (await prisma.$queryRaw`
    SELECT 
      SUBSTRING_INDEX(SUBSTRING_INDEX(REPLACE(REPLACE(url, 'https://', ''), 'http://', ''), '/', 1), '?', 1) as domain,
      COUNT(*) as count
    FROM Link
    WHERE 
      projectId IS NOT NULL 
      AND projectId != ${LEGAL_WORKSPACE_ID}
      AND userId IS NOT NULL
      AND userId != ${LEGAL_USER_ID}
      AND url NOT LIKE 'https%3A%2F%2F%'
    GROUP BY SUBSTRING_INDEX(SUBSTRING_INDEX(REPLACE(REPLACE(url, 'https://', ''), 'http://', ''), '/', 1), '?', 1)
    HAVING count >= 5
    ORDER BY count DESC
  `) as { domain: string; count: number }[];

  console.log(`Found ${topDomains.length} top domains`);
  console.table(topDomains);
  console.log(`"${topDomains.map(({ domain }) => domain).join('", "')}"`);

  await prisma.$disconnect();
}

main();
