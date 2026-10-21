import { flagPartnerForFraud } from "@/lib/api/fraud/flag-partner-for-fraud";
import { withAdmin } from "@/lib/auth";
import { adminFlagFraudSchema } from "@/lib/zod/schemas/admin";
import { NextResponse } from "next/server";

// POST /api/admin/partners/[partnerId]/flag-fraud
export const POST = withAdmin(
  async ({ params, req, session }) => {
    const { partnerId } = params;
    const { reason, reviewNote, banFromNetwork } = adminFlagFraudSchema.parse(
      await req.json(),
    );

    const result = await flagPartnerForFraud({
      partnerId,
      reason,
      reviewNote,
      reviewedById: session.user.id,
      banFromNetwork,
    });

    switch (result.status) {
      case "not_found":
        return new Response("Partner not found.", { status: 404 });
      case "already_flagged":
        return new Response("Partner has already been flagged for fraud.", {
          status: 409,
        });
      case "no_active_enrollments":
        return new Response("Partner has no active program enrollments.", {
          status: 400,
        });
      case "alert_failed":
        return new Response(
          "Alerting enrolled programs failed. Please try again.",
          { status: 500 },
        );
    }

    return NextResponse.json({
      success: true,
      alertedProgramsCount: result.alertedProgramsCount,
    });
  },
  {
    requiredRoles: ["owner"],
  },
);
