import { withSession } from "@/lib/auth";
import { CUSTOMER_IO_TEMPLATES, sendEmail } from "@dub/email";
import { prisma } from "@dub/prisma";
import {
  IUpdateSubscriptionBody,
  IUpdateSubscriptionRes,
} from "core/api/user/subscription/subscription.interface.ts";
import {
  getChargePeriodDaysIdByPlan,
  getPaymentPlanPrice,
  priceConfig,
  TPaymentPlan,
} from "core/integration/payment/config";
import {
  IGetSystemUserDataRes,
  PaymentService,
} from "core/integration/payment/server";
import { ECookieArg } from "core/interfaces/cookie.interface.ts";
import {
  getUserCookieService,
  updateUserCookieService,
} from "core/services/cookie/user-session.service.ts";
import { getUserIp } from "core/util/user-ip.util.ts";
import { format, differenceInCalendarDays } from "date-fns";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

const paymentService = new PaymentService();

const allowedPaymentPlans: Partial<TPaymentPlan>[] = [
  "PRICE_MONTH_PLAN",
  "PRICE_QUARTER_PLAN",
  "PRICE_YEAR_PLAN",
];

const titlesByPlans = {
  PRICE_MONTH_PLAN: "Monthly Plan",
  PRICE_QUARTER_PLAN: "3-Month Plan",
  PRICE_YEAR_PLAN: "12-Month Plan",
};

const getPlanNameByChargePeriodDays = (chargePeriodDays: number) => {
  if (chargePeriodDays === priceConfig.YEARLY_PLAN_CHARGE_PERIOD_DAYS) {
    return "PRICE_YEAR_PLAN";
  }
  if (chargePeriodDays === priceConfig.QUARTERLY_PLAN_CHARGE_PERIOD_DAYS) {
    return "PRICE_QUARTER_PLAN";
  }
  return "PRICE_MONTH_PLAN";
};

const getEmailTemplate = (prevPlan: string, newPlan: string) => {
  if (newPlan === "PRICE_MONTH_PLAN") {
    return CUSTOMER_IO_TEMPLATES.DOWNGRADE_TO_MONTHLY;
  }
  if (prevPlan === "PRICE_YEAR_PLAN" && newPlan === "PRICE_QUARTER_PLAN") {
    return CUSTOMER_IO_TEMPLATES.DOWNGRADE_TO_3_MONTH;
  }
  if (prevPlan === "PRICE_MONTH_PLAN") {
    return CUSTOMER_IO_TEMPLATES.UPGRADE_FROM_MONTHLY;
  }
  if (prevPlan === "PRICE_QUARTER_PLAN" && newPlan === "PRICE_YEAR_PLAN") {
    return CUSTOMER_IO_TEMPLATES.UPGRADE_FROM_3_MONTH;
  }
};

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

    const email = user?.email || authUser?.email;

    console.log("Update subscription");
    console.log("body", body);

    const subData = await paymentService.getClientSubscriptionDataByEmail({
      email: user?.email || authUser?.email,
    });
    const subscription = subData.subscriptions.at(
      -1,
    ) as IGetSystemUserDataRes["subscriptions"][0];
    console.log("sub data", subscription);

    // TODO: better to use plan_name from attributes but attributes doesn't change after subscription update
    // so need to remove getPlanNameByChargePeriodDays method if attributes will be reliable
    // const prevPlan = subData.subscriptions[0].attributes.plan_name;
    const prevPlan = getPlanNameByChargePeriodDays(
      subscription.plan.chargePeriodDays,
    );

    try {
      await paymentService.updateClientSubscription(
        paymentData?.paymentInfo?.subscriptionId || "",
        {
          appendPaidPeriod: true,
          resetNextBillingDate: true,
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
            email: email,
            flow_type: "internal",
            locale: "en",
            mixpanel_user_id:
              user?.id || cookieStore.get(ECookieArg.SESSION_ID)?.value || null,
            plan_name: body.paymentPlan,
            plan_price: priceForPay,
            charge_period_days: chargePeriodDays,
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

      const subDataAfterUpdate =
        await paymentService.getClientSubscriptionDataByEmail({ email: email });
      const newSubData = subDataAfterUpdate.subscriptions.at(
        -1,
      ) as IGetSystemUserDataRes["subscriptions"][0];

      console.log("sub data after update", newSubData);

      const carryoverDays = subscription?.nextBillingDate
        ? differenceInCalendarDays(
            new Date(subscription.nextBillingDate),
            new Date(),
          )
        : 0;

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
        sendEmail({
          email,
          subject: "Sub upgrade",
          template: getEmailTemplate(prevPlan, body.paymentPlan),
          messageData: {
            amount:
              (newSubData.plan.price / 100).toFixed(2) +
              " " +
              newSubData.plan.currencyCode,
            next_billing_date: format(
              new Date(newSubData.nextBillingDate),
              "yyyy-MM-dd",
            ),
            new_plan: titlesByPlans[body.paymentPlan],
            current_plan: titlesByPlans[prevPlan],
            carryover_days: String(carryoverDays),
          },
          customerId: user?.id,
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
