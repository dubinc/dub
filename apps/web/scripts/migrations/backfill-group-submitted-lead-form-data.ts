import "dotenv-flow/config";

import { prefixWorkspaceId } from "@/lib/api/workspaces/workspace-id";
import { prisma } from "@/lib/prisma";
import { submittedLeadFormSchema } from "@/lib/zod/schemas/submitted-lead-form";
import { Prisma } from "@prisma/client";

// Dry run by default. Pass --dry-run=false to write the changes.
const DRY_RUN = !process.argv.slice(2).includes("--dry-run=false");

// Copy each program's submitted lead form to all of its groups and turn the form on for them
async function main() {
  console.log(`DRY_RUN=${DRY_RUN}`);

  const programs = await prisma.program.findMany({
    where: {
      referralFormData: {
        not: Prisma.AnyNull,
      },
    },
    select: {
      id: true,
      name: true,
      workspaceId: true,
      referralFormData: true,
    },
  });

  console.log(`Found ${programs.length} programs with a submitted lead form`);

  // The workspaces of these programs need the submittedLeads flag in Edge Config
  const workspaceIds = new Set<string>();

  for (const program of programs) {
    const parsed = submittedLeadFormSchema.safeParse(program.referralFormData);

    if (!parsed.success) {
      console.error(
        `Skipping ${program.name} (${program.id}): invalid form data`,
        parsed.error.issues,
      );
      continue;
    }

    const count = DRY_RUN
      ? await prisma.partnerGroup.count({
          where: {
            programId: program.id,
          },
        })
      : (
          await prisma.partnerGroup.updateMany({
            where: {
              programId: program.id,
            },
            data: {
              submittedLeadFormData: parsed.data,
              submittedLeadsEnabledAt: new Date(),
            },
          })
        ).count;

    console.log(
      `${DRY_RUN ? "Would update" : "Updated"} ${count} groups for ${program.name} (${program.id})`,
    );

    workspaceIds.add(prefixWorkspaceId(program.workspaceId));
  }

  console.log(
    "Add these workspaces to betaFeatures.submittedLeads in Edge Config:",
    JSON.stringify([...workspaceIds]),
  );
}

main();
