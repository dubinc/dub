import { getPartnerRewardsAndDiscounts } from "@/lib/api/partners/get-partner-rewards-and-discounts";
import { withWorkspace } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET /api/partners/:partnerId/rewards-and-discounts – Get partner rewards and discounts
export const GET = withWorkspace(
  async ({ params, searchParams }) => {
    try {
      const programId = searchParams.programId;

      if (!programId) {
        return NextResponse.json(
          { error: "Missing programId parameter" },
          { status: 400 },
        );
      }

      const rewardsAndDiscounts = await getPartnerRewardsAndDiscounts({
        partnerId: params.partnerId,
        programId,
      });

      return NextResponse.json(rewardsAndDiscounts);
    } catch (error) {
      console.error("Error fetching partner rewards and discounts:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
  {
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);
