import { withAdmin } from "@/lib/auth/admin";
import { getPendingPaypalPayouts } from "@/lib/paypal/get-pending-payouts";
import { NextResponse } from "next/server";

export const GET = withAdmin(async () => {
  const pendingPaypalPayouts = await getPendingPaypalPayouts();
  return NextResponse.json(pendingPaypalPayouts);
});
