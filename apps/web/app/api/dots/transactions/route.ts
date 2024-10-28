import { withWorkspace } from "@/lib/auth";
import { retrieveTransactions } from "@/lib/dots/retrieve-transactions";
import { NextResponse } from "next/server";

// GET /api/dots/transactions – get transactions for a Dots app
export const GET = withWorkspace(async ({ workspace }) => {
  const { dotsAppId } = workspace;

  if (!dotsAppId) {
    return NextResponse.json({ data: [], has_more: false });
  }

  return NextResponse.json(await retrieveTransactions({ dotsAppId }));
});
