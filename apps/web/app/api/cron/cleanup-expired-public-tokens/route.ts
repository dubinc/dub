import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@/lib/prisma";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Cron to remove the expired public embed tokens
// Run every day (0 12 * * *)
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    await prisma.embedPublicToken.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    });

    return NextResponse.json({ status: "OK" });
  } catch (error) {
    await log({
      message: `Links and domain cleanup failed - ${error.message}`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
