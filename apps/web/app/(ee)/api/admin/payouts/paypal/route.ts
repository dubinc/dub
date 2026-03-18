import { withAdmin } from "@/lib/auth/admin";
import { getPendingPaypalPayouts } from "@/lib/paypal/get-pending-payouts";
import { NextResponse } from "next/server";

export const GET = withAdmin(async ({ searchParams }) => {
  const { country, programId } = searchParams;
  const pendingPaypalPayouts = await getPendingPaypalPayouts({
    country,
    programId,
  });
  return NextResponse.json(pendingPaypalPayouts);
});
