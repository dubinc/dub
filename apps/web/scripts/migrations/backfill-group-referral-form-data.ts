import "dotenv-flow/config";

import { prisma } from "@/lib/prisma";
import { submittedLeadFormSchema } from "@/lib/zod/schemas/submitted-lead-form";
import { Prisma } from "@prisma/client";

// Copy each program's submitted lead form to all of its groups and turn the form on for them
async function main() {
  const programs = await prisma.program.findMany({
    where: {
      referralFormData: {
        not: Prisma.AnyNull,
      },
    },
    select: {
      id: true,
      name: true,
      referralFormData: true,
    },
  });

  console.log(`Found ${programs.length} programs with a submitted lead form`);

  for (const program of programs) {
    const parsed = submittedLeadFormSchema.safeParse(program.referralFormData);

    if (!parsed.success) {
      console.error(
        `Skipping ${program.name} (${program.id}): invalid form data`,
        parsed.error.issues,
      );
      continue;
    }

    const { count } = await prisma.partnerGroup.updateMany({
      where: {
        programId: program.id,
      },
      data: {
        referralFormData: parsed.data,
        submittedLeadsEnabledAt: new Date(),
      },
    });

    console.log(`Updated ${count} groups for ${program.name} (${program.id})`);
  }
}

main();
