import { GENERIC_EMAIL_DOMAINS } from "@/lib/is-generic-email";
import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";
import { syncUserPlanToPlain } from "../../lib/plain/sync-user-plan";

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
    },
    where: {
      NOT: GENERIC_EMAIL_DOMAINS.map((domain) => ({
        email: {
          endsWith: `@${domain}`,
        },
      })),
      projects: {
        some: {
          project: {
            plan: {
              not: "free",
            },
          },
          role: "owner",
        },
      },
    },
    take: 50,
    orderBy: {
      createdAt: "asc",
    },
  });

  const chunks = chunk(users, 50);
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    await Promise.allSettled(chunk.map((user) => syncUserPlanToPlain(user)));
    console.log(
      `Backfilled ${chunk.length} users in batch ${i + 1} of ${chunks.length} (out of ${users.length} total users)`,
    );
  }
}

main();
