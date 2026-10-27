import { confirmPartnerFraudAlerts } from "@/lib/api/fraud/confirm-partner-fraud-alerts";
import { banPartnerFromNetwork } from "@/lib/api/partners/network-ban";
import { withAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_FRAUD_REASON_LENGTH } from "@/lib/zod/schemas/partners";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const reviewSchema = z.object({
  status: z.enum(["confirmed", "dismissed"]),
  reviewNote: z.string().trim().max(MAX_FRAUD_REASON_LENGTH).optional(),
  banFromNetwork: z.boolean().optional(),
});

// PATCH /api/admin/fraud-alerts/[fraudAlertId]
export const PATCH = withAdmin(
  async ({ req, params, session }) => {
    const { fraudAlertId } = params;
    const {
      status: newStatus,
      reviewNote,
      banFromNetwork,
    } = reviewSchema.parse(await req.json());

    const fraudAlert = await prisma.fraudAlert.findUnique({
      where: {
        id: fraudAlertId,
      },
      select: {
        partnerId: true,
        status: true,
      },
    });

    if (!fraudAlert) {
      return new Response("Fraud alert not found.", { status: 404 });
    }

    // A retry after a failed ban runs only the ban, since the alert is already confirmed
    if (
      newStatus === "confirmed" &&
      fraudAlert.status === "confirmed" &&
      banFromNetwork
    ) {
      await banPartnerFromNetwork(fraudAlert.partnerId);
      return NextResponse.json({ success: true });
    }

    if (newStatus === "confirmed" && fraudAlert.status !== "pending") {
      return new Response("Fraud alert has already been reviewed.", {
        status: 409,
      });
    }

    const reviewData: Prisma.FraudAlertUpdateManyArgs["data"] = {
      reviewedAt: new Date(),
      reviewNote: reviewNote || null,
      reviewedById: session.user.id,
    };

    if (newStatus === "dismissed") {
      const { count } = await prisma.fraudAlert.updateMany({
        where: {
          id: fraudAlertId,
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

    const { confirmedCount } = await confirmPartnerFraudAlerts({
      partnerId: fraudAlert.partnerId,
      reviewedById: session.user.id,
      reviewNote,
    });

    if (confirmedCount === 0) {
      return new Response("Fraud alert has already been reviewed.", {
        status: 409,
      });
    }

    // Ban only after the confirmation, so a dismissal that wins the race leaves no ban
    if (banFromNetwork) {
      await banPartnerFromNetwork(fraudAlert.partnerId);
    }

    return NextResponse.json({ success: true });
  },
  {
    requiredRoles: ["owner"],
  },
);
