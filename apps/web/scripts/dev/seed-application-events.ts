import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

const randomDateBetween = (start: Date, end: Date) => {
  const startMs = start.getTime();
  const endMs = end.getTime();
  const ms = startMs + Math.random() * (endMs - startMs);
  return new Date(ms);
};

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const sample = <T>(items: readonly T[]) =>
  items[Math.floor(Math.random() * items.length)];

const referralSources = [
  "direct",
  "linkedin.com",
  "twitter.com",
  "marketplace",
  "acme.com",
  "google.com",
] as const;

async function main() {
  const programId = "prog_1K2J9DRWPPJ2F1RX53N92TSGA";

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      programId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      partnerId: true,
      partner: {
        select: {
          country: true,
        },
      },
    },
    take: 10,
  });

  if (programEnrollments.length === 0) {
    console.log(`No enrollments found for program ${programId}`);
    return;
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const { count } = await prisma.programApplicationEvent.createMany({
    data: programEnrollments.map((programEnrollment) => {
      const visitedAt = randomDateBetween(thirtyDaysAgo, now);

      const startedAt = new Date(
        visitedAt.getTime() + randomInt(1, 30) * 60 * 1000,
      );

      const submittedAt = new Date(
        startedAt.getTime() + randomInt(1, 90) * 60 * 1000,
      );

      const decidedAt = new Date(
        submittedAt.getTime() + randomInt(5, 72) * 60 * 60 * 1000,
      );

      const isApproved = Math.random() < 0.7;

      return {
        programId,
        partnerId: programEnrollment.partnerId,
        visitedAt,
        startedAt,
        submittedAt,
        approvedAt: isApproved ? decidedAt : null,
        rejectedAt: isApproved ? null : decidedAt,
        referralSource: sample(referralSources),
        country: programEnrollment.partner.country ?? null,
        // intentionally leaving: referredByPartnerId, programApplicationId
      };
    }),
    skipDuplicates: true,
  });

  console.log(
    `Seeded ${count} ProgramApplicationEvent rows for ACME (first ${programEnrollments.length} partners)`,
  );
}

main();
