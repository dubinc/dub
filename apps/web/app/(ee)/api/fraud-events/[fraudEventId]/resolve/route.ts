import { DubApiError } from "@/lib/api/errors";
import { getFraudEventOrThrow } from "@/lib/api/fraud/get-fraud-event-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  fraudEventSchema,
  resolveFraudEventSchema,
} from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { FraudEventStatus } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// PATCH /api/fraud-events/:fraudEventId/resolve – Resolve a fraud event
export const PATCH = withWorkspace(
  async ({ workspace, params, req, session }) => {
    const { fraudEventId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const fraudEvent = await getFraudEventOrThrow({
      fraudEventId,
      programId,
    });

    if (fraudEvent.status !== FraudEventStatus.pending) {
      throw new DubApiError({
        code: "bad_request",
        message: "This fraud event has already been resolved.",
      });
    }

    const { status, resolutionReason } = resolveFraudEventSchema.parse(
      await parseRequestBody(req),
    );

    const updatedFraudEvent = await prisma.fraudEvent.update({
      where: {
        id: fraudEventId,
      },
      data: {
        status,
        resolutionReason: resolutionReason || null,
        resolvedAt: new Date(),
        userId: session.user.id,
      },
    });

    return NextResponse.json(fraudEventSchema.parse(updatedFraudEvent));
  },
  {
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);
