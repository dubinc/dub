// @ts-nocheck - old migration script

import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const programs = await prisma.program.findMany({
    include: {
      groups: true,
    },
  });

  console.log(`Found ${programs.length} programs.`);

  for (const program of programs) {
    const res = await prisma.partnerGroup.updateMany({
      where: {
        programId: program.id,
      },
      data: {
        logo: program.logo,
        wordmark: program.wordmark,
        brandColor: program.brandColor,
        holdingPeriodDays: program.holdingPeriodDays,
        autoApprovePartnersEnabledAt: program.autoApprovePartnersEnabledAt,
      },
    });
    console.log(
      `Updated ${res.count} partner groups for program ${program.slug}.`,
    );
  }
}

main();
