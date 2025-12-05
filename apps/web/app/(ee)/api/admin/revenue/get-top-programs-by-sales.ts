import { formatUTCDateTimeClickhouse } from "@/lib/analytics/utils/format-utc-datetime-clickhouse";
import { tb } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { ACME_PROGRAM_ID } from "@dub/utils";
import { z } from "zod";

export async function getTopProgramsBySales({
  startDate,
  endDate,
}: {
  startDate: Date;
  endDate: Date;
}) {
  const pipe = tb.buildPipe({
    pipe: "v2_top_programs",
    parameters: z.any(),
    data: z.any(),
  });

  const response = await pipe({
    eventType: "sales",
    start: formatUTCDateTimeClickhouse(startDate),
    end: formatUTCDateTimeClickhouse(endDate),
  });

  const topProgramsData = response.data as {
    programId: string;
  }[];

  const programIds = topProgramsData
    .map((item) => item.programId)
    .filter((id) => id !== ACME_PROGRAM_ID);

  const programs = await prisma.program.findMany({
    where: {
      id: {
        in: programIds,
      },
    },
    select: {
      id: true,
      name: true,
      logo: true,
      _count: {
        select: {
          partners: {
            where: {
              totalCommissions: {
                gt: 0,
              },
            },
          },
        },
      },
    },
  });

  return topProgramsData
    .map((item) => {
      const program = programs.find((program) => program.id === item.programId);
      if (!program) return null;
      const { _count, ...rest } = program;
      return {
        ...rest,
        ...item,
        partners: _count.partners,
      };
    })
    .filter(Boolean);
}
