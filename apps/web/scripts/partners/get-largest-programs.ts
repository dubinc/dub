import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const programsByEnrollmentCount = await prisma.programEnrollment.groupBy({
    by: ["programId"],
    _count: {
      programId: true,
    },
    orderBy: {
      _count: {
        programId: "desc",
      },
    },
    take: 100,
  });

  const filteredProgramsByEnrollmentCount = programsByEnrollmentCount.filter(
    (program) => program._count.programId > 1000,
  );

  console.table(filteredProgramsByEnrollmentCount);

  const programs = await prisma.program
    .findMany({
      where: {
        id: {
          in: filteredProgramsByEnrollmentCount.map(
            (program) => program.programId,
          ),
        },
      },
    })
    .then((programs) =>
      programs
        .map((program) => ({
          id: program.id,
          slug: program.slug,
          enrollmentCount:
            filteredProgramsByEnrollmentCount.find(
              (p) => p.programId === program.id,
            )?._count.programId ?? 0,
        }))
        .sort((a, b) => b.enrollmentCount - a.enrollmentCount),
    );

  console.table(programs);
}

main();
