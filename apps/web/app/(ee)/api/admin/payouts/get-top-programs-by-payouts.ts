import { prisma } from "@/lib/prisma";
import { ACME_PROGRAM_ID, DEMO_PROGRAM_ID } from "@dub/utils";
import { InvoiceStatus } from "@prisma/client";

export async function getTopProgramsByPayouts({
  status,
  startDate,
  endDate,
}: {
  status?: InvoiceStatus;
  startDate: Date;
  endDate: Date;
}) {
  const programPayouts = await prisma.invoice.groupBy({
    by: ["programId"],
    _sum: {
      amount: true,
    },
    where: {
      programId: {
        not: null,
        notIn: [ACME_PROGRAM_ID, DEMO_PROGRAM_ID],
      },
      program: {
        is: {
          NOT: {
            slug: {
              endsWith: "-staging",
            },
          },
        },
      },
      status: status || {
        not: "failed",
      },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      _sum: {
        amount: "desc",
      },
    },
    take: 250,
  });

  const programs = await prisma.program.findMany({
    where: {
      id: {
        in: programPayouts
          .map(({ programId }) => programId)
          .filter((id): id is string => Boolean(id)),
      },
    },
    select: {
      id: true,
      name: true,
      logo: true,
    },
  });

  const programIdMap = Object.fromEntries(
    programs.map((program) => [program.id, program]),
  );

  return programPayouts.flatMap(({ programId, _sum }) => {
    const program = programId ? programIdMap[programId] : null;
    if (!program) return [];
    return [
      {
        ...program,
        payouts: _sum.amount || 0,
      },
    ];
  });
}
