import { flagPartnerForFraud } from "@/lib/api/fraud/flag-partner-for-fraud";
import {
  banPartnerFromNetwork,
  unbanPartnerFromNetwork,
} from "@/lib/api/partners/network-ban";
import { withAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminNetworkBanSchema } from "@/lib/zod/schemas/admin";
import { NextResponse } from "next/server";

async function getPartnerNetworkStatus(partnerId: string) {
  return prisma.partner.findUnique({
    where: {
      id: partnerId,
    },
    select: {
      networkStatus: true,
    },
  });
}

// POST /api/admin/partners/[partnerId]/network-ban – confirm fraud and ban partner from network
export const POST = withAdmin(
  async ({ params, req, session }) => {
    const { partnerId } = params;
    const { reason, reviewNote } = adminNetworkBanSchema.parse(
      await req.json(),
    );

    // No check for an existing ban, so that a retry after a failed fraud
    // alert can still create it (the ban itself is a no-op then)
    const result = await flagPartnerForFraud({
      partnerId,
      reason,
      reviewNote,
      reviewedById: session.user.id,
      banFromNetwork: true,
    });

    switch (result.status) {
      case "not_found":
        return new Response("Partner not found.", { status: 404 });
      case "alert_failed":
        return new Response(
          "Alerting enrolled programs failed. Please try again.",
          { status: 500 },
        );
      // No new fraud alert is possible here, so only ban the partner
      case "already_flagged":
      case "no_active_enrollments":
        await banPartnerFromNetwork(partnerId);
        return NextResponse.json({
          success: true,
          fraudAlertCreated: false,
          fraudAlertSkippedReason: result.status,
          alertedProgramsCount: 0,
        });
    }

    return NextResponse.json({
      success: true,
      fraudAlertCreated: true,
      alertedProgramsCount: result.alertedProgramsCount,
    });
  },
  {
    requiredRoles: ["owner"],
  },
);

// DELETE /api/admin/partners/[partnerId]/network-ban – unban partner from network
export const DELETE = withAdmin(
  async ({ params }) => {
    const { partnerId } = params;

    const partner = await getPartnerNetworkStatus(partnerId);

    if (!partner) {
      return new Response("Partner not found.", { status: 404 });
    }

    if (partner.networkStatus !== "banned") {
      return new Response("Partner is not banned from the network.", {
        status: 400,
      });
    }

    await unbanPartnerFromNetwork(partnerId);

    return NextResponse.json({ success: true });
  },
  {
    requiredRoles: ["owner"],
  },
);
