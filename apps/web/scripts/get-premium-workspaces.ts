import { normalizeWorkspaceId } from "@/lib/api/workspace-id";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

async function main() {
  const workspaces = await prisma.project.findMany({
    where: {
      NOT: {
        plan: "free",
      },
      slug: {
        notIn: ["acme", "legal"],
      },
      domains: {
        none: {
          verified: true,
        },
      },
      links: {
        some: {
          domain: "dub.sh",
          createdAt: {
            gt: new Date("2024-02-01"),
          },
        },
      },
    },
    select: {
      id: true,
      slug: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  console.table(workspaces);
  fs.writeFileSync(
    "premium_workspaces.csv",
    Papa.unparse(
      workspaces.map((w) => ({
        id: normalizeWorkspaceId(w.id),
        slug: w.slug,
      })),
    ),
  );
}

main();
