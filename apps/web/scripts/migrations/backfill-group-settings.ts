import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// Step 1 of 2: Backfill partner groups with link settings
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
