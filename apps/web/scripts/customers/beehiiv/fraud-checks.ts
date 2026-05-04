import { prisma } from "@dub/prisma";
import { FraudRuleType } from "@dub/prisma/client";
import { currencyFormatter } from "@dub/utils";
import "dotenv-flow/config";
import { createFraudEvents } from "../../../lib/api/fraud/create-fraud-events";

async function main() {
  const programId = "prog_xxx";

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      programId,
      status: "approved",
      partner: {
        programs: {
          some: {
            status: "banned",
          },
        },
      },
    },
    include: {
      partner: {
        select: {
          email: true,
          programs: {
            where: {
              status: "banned",
            },
            select: {
              partnerId: true,
              programId: true,
              bannedAt: true,
              bannedReason: true,
            },
            orderBy: {
              bannedAt: "asc",
            },
          },
        },
      },
    },
  });

  console.table(
    programEnrollments.map(({ partner, totalCommissions }) => ({
      email: partner.email,
      bannedPrograms: partner.programs.length,
      totalCommissions: currencyFormatter(totalCommissions),
    })),
  );

  await createFraudEvents(
    programEnrollments
      .flatMap((pe) => pe.partner.programs)
      .map((program) => ({
        programId: programId,
        partnerId: program.partnerId,
        type: FraudRuleType.partnerCrossProgramBan,
        sourceProgramId: program.programId,
        metadata: {
          bannedReason: program.bannedReason,
          bannedAt: program.bannedAt,
        },
      })),
  );
}

main();
