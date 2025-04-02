import { NextResponse } from "next/server";
import { campaigns } from "../campaigns";

export async function GET(
  request: Request,
  { params }: { params: { campaignId: string } },
) {
  const { campaignId } = params;

  const campaign = campaigns.find((c) => c.id === campaignId);

  return NextResponse.json(campaign);
}
