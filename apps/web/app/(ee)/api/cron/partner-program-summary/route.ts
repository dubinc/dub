import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";

/*
  This route is used to send program reports to partners.
  Runs once every month on the 1st day
*/

export const dynamic = "force-dynamic";

async function handler(req: Request) {
  try {
    if (req.method === "GET") {
      await verifyVercelSignature(req);
    } else if (req.method === "POST") {
      await verifyQstashSignature({
        req,
        rawBody: await req.text(),
      });
    }

    const programs = await prisma.program.findMany({
      take: 10,
      orderBy: {
        createdAt: "asc",
      },
    });

    if (programs.length === 0) {
      console.info("No programs found.");
      return;
    }

    return NextResponse.json("Ok");
  } catch (error) {
    await log({
      message: `Error sending partner program summary: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}

export { handler as GET, handler as POST };
