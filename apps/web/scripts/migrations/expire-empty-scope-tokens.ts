import "dotenv-flow/config";

import { tokenCache } from "@/lib/auth/token-cache";
import { prisma } from "@/lib/prisma";

// Expire RestrictedTokens that have null or empty scopes.
async function main() {
  const now = new Date();

  const tokens = await prisma.restrictedToken.findMany({
    where: {
      AND: [
        { OR: [{ scopes: null }, { scopes: "" }] },
        { OR: [{ expires: null }, { expires: { gt: now } }] },
        {
          OR: [
            { lastUsed: null },
            {
              lastUsed: {
                lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          ],
        },
      ],
    },
    orderBy: {
      lastUsed: "asc",
    },
    include: {
      project: {
        select: {
          name: true,
          slug: true,
          plan: true,
          trialEndsAt: true,
        },
      },
    },
  });

  console.table(
    tokens.map(
      ({ id, name, projectId, partialKey, lastUsed, scopes, project }) => ({
        id,
        name,
        projectId,
        workspace: project.name,
        slug: project.slug,
        plan: project.plan,
        partialKey,
        lastUsed,
        scopes,
      }),
    ),
  );

  if (tokens.length === 0) {
    console.log("No tokens to expire");
    return;
  }

  const { count } = await prisma.restrictedToken.updateMany({
    where: {
      id: {
        in: tokens.map((token) => token.id),
      },
    },
    data: {
      expires: now,
    },
  });

  console.log(`Expired ${count} tokens`);

  await tokenCache.expireMany({
    hashedKeys: tokens.map((token) => token.hashedKey),
  });

  console.log(`Invalidated cache for ${tokens.length} tokens`);
}

main();
