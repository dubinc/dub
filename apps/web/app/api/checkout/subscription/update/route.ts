import { withSession } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import {
  IUpdateSubscriptionBody,
  IUpdateSubscriptionRes,
} from "core/api/user/subscription/subscription.interface.ts";
import {
  getChargePeriodDaysIdByPlan,
  getPaymentPlanPrice,
  TPaymentPlan,
} from "core/integration/payment/config";
import { PaymentService } from "core/integration/payment/server";
import { ECookieArg } from "core/interfaces/cookie.interface.ts";
import {
  getUserCookieService,
  updateUserCookieService,
} from "core/services/cookie/user-session.service.ts";
import { getUserIp } from "core/util/user-ip.util.ts";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

const paymentService = new PaymentService();

const allowedPaymentPlans: Partial<TPaymentPlan>[] = [
  "PRICE_MONTH_PLAN",
  "PRICE_QUARTER_PLAN",
  "PRICE_YEAR_PLAN",
];

// update user subscription
export const POST = withSession(
  async ({
    req,
    session: authSession,
  }): Promise<NextResponse<IUpdateSubscriptionRes>> => {
    const authUser = authSession?.user;
    const paymentData = authUser?.paymentData;

    if (!authUser || !paymentData?.paymentInfo?.customerId) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 400 },
      );
    }

    const body: IUpdateSubscriptionBody = await req.json();

    if (!body.paymentPlan || !allowedPaymentPlans.includes(body.paymentPlan)) {
      return NextResponse.json(
        { success: false, error: "Payment plan not found" },
        { status: 400 },
      );
    }

    const headerStore = headers();
    const cookieStore = cookies();

    const { user } = await getUserCookieService();

    const subProcessorData = await paymentService.getProcessorByCustomerId(
      user!.id! || cookieStore.get(ECookieArg.SESSION_ID)!.value!,
    );

    const { priceForPay } = getPaymentPlanPrice({
      paymentPlan: body.paymentPlan,
      user,
    });

    const chargePeriodDays = getChargePeriodDaysIdByPlan({
      paymentPlan: body.paymentPlan,
      user: user!,
    });

    console.log("Update subscription");
    console.log("body", body);
    console.log("paymentData", paymentData);
    console.log("priceForPay", priceForPay);
    console.log("chargePeriodDays", chargePeriodDays);

    console.log("user", user);

    console.log("sub data", await paymentService.getClientSubscriptionDataByEmail({ email: user?.email || authUser?.email }));

    try {
      await paymentService.updateClientSubscription(
        paymentData?.paymentInfo?.subscriptionId || "",
        {
          noSubtract: true,
          resetNextBillingDate: false,
          plan: {
            currencyCode: paymentData?.currency?.currencyForPay || "",
            trialPrice: 0,
            trialPeriodDays: 0,
            price: priceForPay,
            chargePeriodDays,
            secondary: false,
            twoSteps: false,
          },
          attributes: {
            //**** antifraud sessions ****//
            ...(paymentData?.sessions && { ...paymentData.sessions }),

            //**** for analytics ****//
            email: user?.email || null,
            flow_type: "internal",
            locale: "en",
            mixpanel_user_id:
              user?.id || cookieStore.get(ECookieArg.SESSION_ID)?.value || null,
            plan_name: body.paymentPlan,
            payment_subtype: "SUBSCRIPTION",
            billing_action: "rebill",
            //**** for analytics ****//

            //**** fields for subscription system ****//
            sub_user_id_primer: paymentData?.paymentInfo?.customerId || null,
            sub_order_country: paymentData.currency?.countryCode || null,
            ipAddress: getUserIp(headerStore)!,
            subscriptionType: "APP_SUBSCRIPTION",
            application: `${process.env.NEXT_PUBLIC_PAYMENT_ENV}`,
            ...subProcessorData,
            //**** fields for subscription system ****//
            ...subProcessorData,
          },
        },
      );

      console.log("sub data after update", await paymentService.getClientSubscriptionDataByEmail({ email: user?.email || authUser?.email }));

      await Promise.all([
        prisma.user.update({
          where: {
            id: authUser.id,
          },
          data: {
            paymentData: {
              ...authUser?.paymentData,
              paymentInfo: {
                ...authUser?.paymentData?.paymentInfo,
                subscriptionPlanCode: body.paymentPlan,
              },
            },
          },
        }),
        updateUserCookieService({
          paymentInfo: {
            ...user?.paymentInfo,
            subscriptionPlanCode: body.paymentPlan,
          },
        }),
      ]);

      return NextResponse.json({ success: true });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error?.message },
        { status: 500 },
      );
    }
  },
);
