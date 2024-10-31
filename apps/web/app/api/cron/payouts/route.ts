import { processMonthlyPartnerPayouts } from "@/lib/api/sales/payout";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await processMonthlyPartnerPayouts();

  return NextResponse.json({ message: "Payouts calculated" });
}
