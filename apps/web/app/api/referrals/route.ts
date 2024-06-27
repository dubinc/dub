import { withWorkspace } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET /api/payouts - list payouts for the workspace
export const GET = withWorkspace(async ({ workspace }) => {
  // Fake payouts data
  const payouts = [
    {
      id: "1",
      paymentMethod: "stripe",
      status: "pending",
      total: 5980,
      refunds: 0,
      disputes: 0,
      taxes: 0,
      payoutFee: 0,
      netTotal: 5980,
      currency: "USD",
      dueAt: "2024-06-14T00:00:00.000000Z",
      createdAt: "2024-06-01T00:32:40.000000Z",
      updatedAt: "2024-06-01T00:32:40.000000Z",
    },
  ];

  return NextResponse.json(payouts);
});

// Payouts include multiple Sales events (A Sale event can be disputed, refunded, etc.)
// Calculate payouts based on the sales events for an affiliate (Workspace + Affiliate + Period)
