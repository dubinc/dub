import { GENERIC_EMAIL_DOMAINS } from "@/lib/is-generic-email";
import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";
import { syncCustomerPlanToPlain } from "../../lib/plain/sync-customer-plan";

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
    orderBy: {
      createdAt: "asc",
    },
  });

  const chunks = chunk(users, 50);
  for (const chunk of chunks) {
    await Promise.allSettled(
      chunk.map((user) =>
        syncCustomerPlanToPlain({
          customer: user,
        }),
      ),
    );
  }
}

main();
