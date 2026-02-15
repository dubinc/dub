import { NextResponse } from "next/server";

// POST /api/postbacks/failure - failure callback from QStash
export const POST = async (req: Request) => {
  return NextResponse.json({ received: true }, { status: 200 });
};
