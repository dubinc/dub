import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import { RewardfulApi } from "app/api/programs/[programId]/rewardful/importer";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  programId: z.string(),
  action: z.enum(["import-affiliates"]),
});

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { programId } = schema.parse(JSON.parse(rawBody));

    await prisma.program.findUniqueOrThrow({
      where: {
        id: programId,
      },
      select: {
        id: true,
      },
    });

    const rewardfulApi = new RewardfulApi({
      programId,
    });

    const affiliates = await rewardfulApi.listAffiliates();

    console.log(affiliates);

    return NextResponse.json({
      programId,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
