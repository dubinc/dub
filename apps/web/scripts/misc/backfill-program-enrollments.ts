import "dotenv-flow/config";

import { createProgramEnrollment } from "@/lib/partners/create-program-enrollment";
import { createProgramApplicationSchema } from "@/lib/zod/schemas/programs";
import { prisma } from "@dub/prisma";

async function main() {
  // Commit 5cf0dfddd53be430afd695b4cbccf8cc22f33d2b
  const sinceTimestamp = new Date("2026-02-11T19:13:44Z");

  let programApplications = await prisma.programApplication.findMany({
    where: {
      enrollment: null,
      createdAt: {
        gte: sinceTimestamp,
      },
    },
    include: {
      partnerGroup: true,
      program: {
        include: {
          workspace: {
            select: {
              id: true,
              webhookEnabled: true,
            },
          },
          groups: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 2,
  });

  console.table(
    programApplications.map((application) => ({
      program: application.program.name,
      email: application.email,
      createdAt: application.createdAt,
    })),
  );

  const users = await prisma.user.findMany({
    where: {
      email: {
        in: programApplications.map(({ email }) => email),
      },
      defaultPartnerId: {
        not: null,
      },
    },
    select: {
      email: true,
      name: true,
      defaultPartnerId: true,
      partners: {
        include: {
          partner: true,
        },
      },
    },
  });

  const userEmailAddresses = users.map(({ email }) => email);

  // Filter out program applications that don't have a user account associated with them
  programApplications = programApplications.filter(({ email }) =>
    userEmailAddresses.includes(email),
  );

  const userEmailMap = new Map(users.map((user) => [user.email, user]));

  // Create program enrollments
  for (const programApplication of programApplications) {
    const user = userEmailMap.get(programApplication.email);

    if (!user) {
      console.error(
        `User not found for program application: ${programApplication.id}`,
      );
      continue;
    }

    const partnerUser = user.partners.find(
      (pu) => pu.partnerId === user.defaultPartnerId,
    );
    const partner = partnerUser?.partner;

    if (!partner) {
      console.error(
        `Partner not found for program application: ${programApplication.id}`,
      );
      continue;
    }

    const group = programApplication.partnerGroup;

    const defaultGroup = programApplication.program.groups.find(
      (group) => group.slug === "default",
    );

    const partnerGroup = group ?? defaultGroup;

    if (!partnerGroup) {
      console.error(
        `Group not found for program application: ${programApplication.id}`,
      );
      continue;
    }

    const workspace = programApplication.program.workspace;

    const data = createProgramApplicationSchema.parse(programApplication);

    try {
      await createProgramEnrollment({
        workspace,
        program: programApplication.program,
        partner,
        group: partnerGroup,
        data,
        application: programApplication,
      });
    } catch (error) {
      console.error(`Error creating program application ${error}`);
      continue;
    }
  }
}

main();
