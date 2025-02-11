import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { RewardfulApi } from "@/lib/rewardful/api";
import { RewardfulImporter } from "@/lib/rewardful/importer";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  programId: z.string(),
  action: z
    .enum(["import-affiliates", "import-referrals"])
    .default("import-referrals"),
  page: z.number().optional().default(1),
});

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { programId, action, page } = schema.parse(JSON.parse(rawBody));

    const { workspace, ...program } = await prisma.program.findUniqueOrThrow({
      where: {
        id: programId,
      },
      include: {
        workspace: true,
      },
    });

    const rewardfulApi = new RewardfulApi({
      programId,
    });

    const importer = new RewardfulImporter({
      programId,
    });

    // Import affiliates
    if (action === "import-affiliates") {
      await importer.importAffiliates({
        workspace,
        page,
      });
    } else if (action === "import-referrals") {
      await importer.importReferrals({
        workspace,
        page,
      });
    }

    return NextResponse.json({
      programId,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
