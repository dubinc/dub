import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await req.json();

  if (!userId) {
    return new NextResponse("Missing userId", { status: 400 });
  }

  try {
    await prisma.link.updateMany({
      where: { userId },
      data: { archived: true }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return new NextResponse("Error archiving links", { status: 500 });
  }
} 