import { getSession } from "@/lib/auth";
import { checkTrialOver } from "@/lib/trial/check-trial-over";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const isTrialOver = await checkTrialOver(session.user.id);
    return NextResponse.json({ isTrialOver });
  } catch (error) {
    console.error("Error checking trial status:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
