import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

/* 
  Follow-up to scripts/migrate-rewards.ts
  This script migrates the rewards remainder for program enrollments that don't have a reward.
  It does so by finding the default reward for the program and assigning it to the enrollment.
*/
async function main() {
  const programEnrollmentsWithNoReward =
    await prisma.programEnrollment.findMany({
      where: {
        clickRewardId: null,
        leadRewardId: null,
        saleRewardId: null,
      },
    });

  console.table(programEnrollmentsWithNoReward, [
    "id",
    "programId",
    "partnerId",
    "clickRewardId",
    "leadRewardId",
    "saleRewardId",
  ]);

  const programDefaultRewards = await prisma.reward.findMany({
    where: {
      programId: {
        in: programEnrollmentsWithNoReward.map(
          (enrollment) => enrollment.programId,
        ),
      },
      default: true,
    },
  });

  console.table(programDefaultRewards, [
    "id",
    "programId",
    "event",
    "type",
    "amount",
  ]);

  const updatedEnrollments = programEnrollmentsWithNoReward.map(
    (enrollment) => ({
      ...enrollment,
      clickRewardId: programDefaultRewards.find(
        (reward) =>
          reward.event === "click" && reward.programId === enrollment.programId,
      )?.id,
      leadRewardId: programDefaultRewards.find(
        (reward) =>
          reward.event === "lead" && reward.programId === enrollment.programId,
      )?.id,
      saleRewardId: programDefaultRewards.find(
        (reward) =>
          reward.event === "sale" && reward.programId === enrollment.programId,
      )?.id,
    }),
  );

  console.table(updatedEnrollments, [
    "id",
    "programId",
    "partnerId",
    "clickRewardId",
    "leadRewardId",
    "saleRewardId",
  ]);

  await Promise.all(
    updatedEnrollments.map((enrollment) =>
      prisma.programEnrollment.update({
        where: { id: enrollment.id },
        data: {
          clickRewardId: enrollment.clickRewardId,
          leadRewardId: enrollment.leadRewardId,
          saleRewardId: enrollment.saleRewardId,
        },
      }),
    ),
  );
}

main();
