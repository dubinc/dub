import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { formatDiscountDescription } from "@/ui/partners/format-discount-description";
import { prisma } from "@dub/prisma";

export async function getPartnerRewardsAndDiscounts({
  partnerId,
  programId,
}: {
  partnerId: string;
  programId: string;
}) {
  const enrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    include: {
      clickReward: true,
      leadReward: true,
      saleReward: true,
      discount: true,
    },
  });

  if (!enrollment) return null;

  const rewards: Array<{
    type: "click" | "lead" | "sale";
    iconType: "CursorRays" | "UserPlus" | "InvoiceDollar";
    text: string;
    reward: any;
  }> = [];
  const discount = enrollment.discount;

  // Add click reward if exists
  if (enrollment.clickReward) {
    rewards.push({
      type: "click" as const,
      iconType: "CursorRays" as const,
      text: `${constructRewardAmount(enrollment.clickReward)} per click`,
      reward: enrollment.clickReward,
    });
  }

  // Add lead reward if exists
  if (enrollment.leadReward) {
    rewards.push({
      type: "lead" as const,
      iconType: "UserPlus" as const,
      text: `${constructRewardAmount(enrollment.leadReward)} per lead`,
      reward: enrollment.leadReward,
    });
  }

  // Add sale reward if exists
  if (enrollment.saleReward) {
    let durationText = "";

    if (enrollment.saleReward.maxDuration === null) {
      durationText = " for the customer's lifetime";
    } else if (enrollment.saleReward.maxDuration === 0) {
      durationText = " for the first sale";
    } else if (enrollment.saleReward.maxDuration > 1) {
      durationText =
        enrollment.saleReward.maxDuration % 12 === 0
          ? ` for ${enrollment.saleReward.maxDuration / 12} year${enrollment.saleReward.maxDuration / 12 > 1 ? "s" : ""}`
          : ` for ${enrollment.saleReward.maxDuration} month${enrollment.saleReward.maxDuration > 1 ? "s" : ""}`;
    }

    const rewardAmount = constructRewardAmount(enrollment.saleReward);
    const prefix = enrollment.saleReward.type === "percentage" ? "Up to " : "";

    rewards.push({
      type: "sale" as const,
      iconType: "InvoiceDollar" as const,
      text: `${prefix}${rewardAmount} per sale${durationText}`,
      reward: enrollment.saleReward,
    });
  }

  return {
    rewards,
    discount: discount
      ? {
          text: formatDiscountDescription({ discount }),
          discount,
        }
      : null,
  };
}
