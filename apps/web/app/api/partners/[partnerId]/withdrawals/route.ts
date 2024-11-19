import { withPartner } from "@/lib/auth/partner";
import { retrieveTransfers } from "@/lib/dots/retrieve-transfers";
import { dotsWithdrawalsSchema } from "@/lib/dots/schemas";
import { NextResponse } from "next/server";

// GET /api/partners/[partnerId]/withdrawals – get withdrawals for a partner
export const GET = withPartner(async ({ partner }) => {
  const { dotsUserId } = partner;

  if (!dotsUserId) {
    return NextResponse.json({ data: [], has_more: false });
  }

  const { data, has_more } = await retrieveTransfers({
    dotsUserId,
    type: "payout",
  });

  const processedData = data.map((t) => {
    return {
      ...t,
      platform: t.external_data?.platform,
      fee:
        t.transactions?.find(
          (t) => t.type === "fee" && t.source_name !== "Dub Partners",
        )?.amount || "0",
    };
  });

  return NextResponse.json(
    dotsWithdrawalsSchema.parse({
      data: processedData,
      has_more,
    }),
  );
});
