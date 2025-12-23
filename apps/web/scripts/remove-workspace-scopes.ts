import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  // Find all restricted tokens that have the workspace.* scopes
  const tokens = await prisma.restrictedToken.findMany({
    where: {
      scopes: {
        contains: "workspaces.",
      },
      installationId: {
        not: null,
      },
    },
    select: {
      id: true,
      scopes: true,
      lastUsed: true,
    },
    take: 100,
  });

  console.table(tokens);

  // Remove the workspace.* scopes from the tokens
  const results = await Promise.allSettled(
    tokens.map((token) => {
      if (!token.scopes) return Promise.resolve(null);

      // Split by spaces, filter out "workspaces.read" and "workspaces.write", and join back
      const updatedScopes = token.scopes
        .split(" ")
        .filter((scope) => !scope.startsWith("workspaces."))
        .join(" ")
        .trim();

      return prisma.restrictedToken.update({
        where: {
          id: token.id,
        },
        data: {
          scopes: updatedScopes || null,
        },
      });
    }),
  );

  console.log(
    `Updated ${results.filter((r) => r.status === "fulfilled").length} tokens.`,
  );
}

main();
