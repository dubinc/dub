import { NextResponse } from "next/server";

import { withSession } from "@/lib/auth/session";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import { trackMixpanelApiService } from "core/integration/analytic/services/track-mixpanel-api.service";
import { PaymentService } from "core/integration/payment/server";
import { IDataRes } from "core/interfaces/common.interface";
import { getUserCookieService } from "core/services/cookie/user-session.service";

interface ICancelSubscriptionStatusRes extends IDataRes {
  data?: { nextBillingDate?: string; subscriptionPrice?: number } | null;
}

const paymentService = new PaymentService();

// set user session
export const POST = withSession(async () => {
  const { user } = await getUserCookieService();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 404 },
    );
  }

  const {
    status: subscriptionStatus,
    subscriptionId,
    isScheduledForCancellation,
    nextBillingDate,
  } = await paymentService.checkClientSubscriptionStatus({
    email: user?.email || "",
  });

  if (isScheduledForCancellation) {
    return NextResponse.json({
      success: true,
      data: { nextBillingDate: nextBillingDate! },
    });
  }

  try {
    await paymentService.cancelClientSubscriptionBySchedule(
      subscriptionId || user?.paymentInfo?.subscriptionId || "",
      subscriptionStatus === "dunning"
        ? { cancelReason: "requested_but_dunned" }
        : {},
    );

    await trackMixpanelApiService({
      event: EAnalyticEvents.SUBSCRIPTION_CANCELLED,
      params: {
        type: subscriptionStatus === "dunning" ? "full" : "scheduled",
        content_group: "portal",
        flow_type: "standard",
      },
      email: user.email!,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      data: { nextBillingDate: nextBillingDate! },
    });
  } catch (error: any) {
    await trackMixpanelApiService({
      event: EAnalyticEvents.SUBSCRIPTION_CANCELLED_ERROR,
      params: {
        type: "scheduled",
        content_group: "portal",
        flow_type: "standard",
        error_code: error?.code || 500,
        error_message:
          (error?.message || error?.msg)?.replace(
            process.env.NEXT_PUBLIC_SYSTEM_PAYMENT_API_URL,
            "",
          ) || null,
      },
      email: user.email!,
      userId: user.id,
    });

    return NextResponse.json(
      {
        success: false,
        error: `Server error: subscription cancel error`,
      },
      { status: 500 },
    );
  }
});
