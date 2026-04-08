import { reportCrossProgramBanToNetwork } from "@/lib/api/fraud/report-cross-program-ban-to-network";
import { withAdmin } from "@/lib/auth";
import { MAX_FRAUD_REASON_LENGTH } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const reviewSchema = z.object({
  status: z.enum(["confirmed", "dismissed"]),
  reviewNote: z.string().trim().max(MAX_FRAUD_REASON_LENGTH).optional(),
});

// PATCH /api/admin/fraud-alerts/[id]
export const PATCH = withAdmin(async ({ req, params, session }) => {
  const { id } = params;
  const { status: newStatus, reviewNote } = reviewSchema.parse(
    await req.json(),
  );

  const fraudAlert = await prisma.fraudAlert.findUnique({
    where: {
      id,
    },
    include: {
      programEnrollment: {
        select: {
          bannedAt: true,
          bannedReason: true,
        },
      },
    },
  });

  if (!fraudAlert) {
    return new Response("Fraud alert not found.", { status: 404 });
  }

  const reviewData: Prisma.FraudAlertUpdateManyArgs["data"] = {
    reviewedAt: new Date(),
    reviewNote: reviewNote || null,
    reviewedById: session.user.id,
  };

  if (newStatus === "dismissed") {
    const { count } = await prisma.fraudAlert.updateMany({
      where: {
        id,
        status: "pending",
      },
      data: {
        status: "dismissed",
        ...reviewData,
      },
    });

    if (count === 0) {
      return new Response("Fraud alert has already been reviewed.", {
        status: 409,
      });
    }

    return NextResponse.json({ success: true });
  }

  // Fetch all pending fraud alerts for this partner (for cross-program ban reporting)
  const pendingFraudAlerts = await prisma.fraudAlert.findMany({
    where: {
      partnerId: fraudAlert.partnerId,
      status: "pending",
    },
    select: {
      id: true,
      programEnrollment: {
        select: {
          programId: true,
          partnerId: true,
          bannedReason: true,
          bannedAt: true,
        },
      },
    },
  });

  if (pendingFraudAlerts.length === 0) {
    return new Response("Fraud alert has already been reviewed.", {
      status: 409,
    });
  }

  await prisma.fraudAlert.updateMany({
    where: {
      id: {
        in: pendingFraudAlerts.map((fa) => fa.id),
      },
      status: "pending",
    },
    data: {
      status: "confirmed",
      ...reviewData,
    },
  });

  waitUntil(
    Promise.allSettled(
      pendingFraudAlerts.map(({ programEnrollment }) =>
        reportCrossProgramBanToNetwork({
          partnerId: programEnrollment.partnerId,
          programId: programEnrollment.programId,
          bannedReason: programEnrollment.bannedReason,
          bannedAt: programEnrollment.bannedAt,
        }),
      ),
    ),
  );

  return NextResponse.json({ success: true });
});
