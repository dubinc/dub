import { prisma } from "@/lib/prisma";

export const processProgramsPayouts = async () => {
  const programs = await prisma.program.findMany();

  if (!programs.length) {
    return;
  }

  for (const program of programs) {
    await createPartnerPayouts({
      programId: program.id,
      startDate: new Date(0),
      endDate: new Date(),
    });
  }
};

// WIP
export const createPartnerPayouts = async ({
  programId,
  startDate,
  endDate,
}: {
  programId: string;
  startDate: Date;
  endDate: Date;
}) => {
  const sales = await prisma.sale.groupBy({
    by: ["partnerId"],
    where: {
      programId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    _sum: {
      commissionEarned: true,
    },
    _count: {
      id: true,
    },
  });

  console.log("createPartnerPayouts", sales);
};
