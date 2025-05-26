import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import z from "zod";
import { confirmPayouts } from "./confirm-payouts";
import { splitPayouts } from "./split-payouts";

export const dynamic = "force-dynamic";

const confirmPayoutsSchema = z.object({
  workspaceId: z.string(),
  userId: z.string(),
  paymentMethodId: z.string(),
  cutoffPeriod: z.string().optional(),
});

// POST /api/cron/payouts/confirm
// This route is used to confirm payouts for a given invoice
// we're intentionally offloading this to a cron job to avoid blocking the main thread
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({ req, rawBody });

    const { workspaceId, userId, paymentMethodId, cutoffPeriod } =
      confirmPayoutsSchema.parse(JSON.parse(rawBody));

    const workspace = await prisma.project.findUniqueOrThrow({
      where: {
        id: workspaceId,
      },
    });

    const program = await prisma.program.findUniqueOrThrow({
      where: {
        id: getDefaultProgramIdOrThrow(workspace),
      },
    });

    if (cutoffPeriod) {
      await splitPayouts({
        program,
        cutoffPeriod,
      });
    }

    await confirmPayouts({
      workspace,
      program,
      userId,
      paymentMethodId,
      cutoffPeriod,
    });

    return new Response(`Payouts confirmed for program ${program.name}.`);
  } catch (error) {
    await log({
      message: `Error confirming payouts for program: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}
