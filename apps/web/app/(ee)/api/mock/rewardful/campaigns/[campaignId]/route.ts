import { NextResponse } from "next/server";
import { campaigns } from "../campaigns";

export async function GET(
  request: Request,
  props: { params: Promise<{ campaignId: string }> },
) {
  const params = await props.params;
  const { campaignId } = params;

  const campaign = campaigns.find((c) => c.id === campaignId);

  return NextResponse.json(campaign);
}
