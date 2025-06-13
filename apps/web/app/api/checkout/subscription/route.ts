import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { withSession } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import {
  ICreateSubscriptionBody,
  ICreateSubscriptionRes,
} from "core/api/user/subscription/subscription.interface.ts";
import {
  getPaymentPlanPrice,
  ICustomerBody,
  TPaymentPlan,
} from "core/integration/payment/config";
import { PaymentService } from "core/integration/payment/server";
import { ECookieArg } from "core/interfaces/cookie.interface.ts";
import { updateUserCookieService } from "core/services/cookie/user-session.service.ts";
import { getUserIp } from "core/util/user-ip.util.ts";

const paymentService = new PaymentService();

const getChargePeriodDaysIdByPlan = ({
  user,
  paymentPlan,
}: {
  user: ICustomerBody;
  paymentPlan: TPaymentPlan;
}) => {
  const {
    QUARTERLY_PLAN_CHARGE_PERIOD_DAYS,
    HALF_YEARLY_PLAN_CHARGE_PERIOD_DAYS,
    YEARLY_PLAN_CHARGE_PERIOD_DAYS,
  } = getPaymentPlanPrice({ paymentPlan: "MIN_PRICE", user }); //MIN_PRICE is plug

  const periodIdsByPlan = {
    PRICE_QUARTER_PLAN: QUARTERLY_PLAN_CHARGE_PERIOD_DAYS,
    PRICE_HALF_YEAR_PLAN: HALF_YEARLY_PLAN_CHARGE_PERIOD_DAYS,
    PRICE_YEAR_PLAN: YEARLY_PLAN_CHARGE_PERIOD_DAYS,
  };

  return periodIdsByPlan[paymentPlan];
};

// create user subscription
export const POST = withSession(
  async ({
    req,
    session: authSession,
  }): Promise<NextResponse<ICreateSubscriptionRes>> => {
    const body: ICreateSubscriptionBody = await req.json();
    if (!body.payment?.orderId || !body.payment?.id) {
      return NextResponse.json(
        { success: false, error: "Payment info not found" },
        { status: 400 },
      );
    }

    const user = await updateUserCookieService({
      currency: { currencyForPay: body.payment.currencyCode },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 400 },
      );
    }

    const { priceForPay: price } = getPaymentPlanPrice({
      paymentPlan: body.paymentPlan,
      user: {
        ...user,
        paymentInfo: {
          ...user.paymentInfo,
          paymentMethodType: body.payment.paymentMethodType,
        },
      },
    });

    const headerStore = headers();
    const cookieStore = cookies();

    const metadata: { [key: string]: string | number | null } = {
      ...body.metadata,
      ...body.payment,

      //**** antifraud sessions ****//
      ...user.sessions,

      //**** for analytics ****//
      email: authSession.user.email,
      flow_type: "internal",
      locale: "en",
      mixpanel_user_id:
        authSession.user.id ||
        cookieStore.get(ECookieArg.SESSION_ID)?.value ||
        null,
      plan_name: body.paymentPlan,
      //**** for analytics ****//

      //**** fields for subscription system ****//
      sub_user_id_primer: user?.paymentInfo?.customerId || null,
      sub_order_country: user.currency?.countryCode || null,
      ipAddress: getUserIp(headerStore)!,
      subscriptionType: `APP_SUBSCRIPTION`,
      application: `${process.env.NEXT_PUBLIC_PAYMENT_ENV}`,
      //**** fields for subscription system ****//
    };

    try {
      const { tokenOnboardingData, paymentMethodToken } =
        await paymentService.createClientSubscription({
          user: {
            email: user.email || "",
            country: user.currency?.countryCode || "",
            externalId: user.paymentInfo?.customerId || "",
            nationalDocumentId: body?.nationalDocumentId,
            attributes: { ...metadata },
          },
          subscription: {
            plan: {
              currencyCode: user.currency?.currencyForPay || "",
              trialPrice: 0,
              trialPeriodDays: 0,
              price,
              chargePeriodDays: getChargePeriodDaysIdByPlan({
                paymentPlan: body.paymentPlan,
                user,
              }),
              secondary: false,
              twoSteps: false,
            },
            attributes: { ...metadata },
          },
          orderAmount: price,
          orderCurrencyCode: user.currency?.currencyForPay || "",
          orderPaymentID: body.payment.id,
          orderExternalID: body.payment.orderId,
        });

      const updatedUser = await updateUserCookieService({
        paymentInfo: {
          ...user.paymentInfo,
          paymentMethodToken,
          subscriptionId: tokenOnboardingData.subscription.id,
          subscriptionPlanCode: body.paymentPlan,
          paymentType: body.payment.paymentType,
          paymentMethodType: body.payment.paymentMethodType,
          paymentProcessor: body.payment.paymentProcessor,
          nationalDocumentId: body?.nationalDocumentId,
        },
        sessions: {
          ...user.sessions,
        },
      });

      await Promise.all([
        prisma.user.update({
          where: {
            id: authSession.user.id,
          },
          data: {
            paymentData: {
              paymentInfo: updatedUser.paymentInfo,
              currency: updatedUser.currency,
              sessions: updatedUser.sessions,
            },
          },
        }),
        // sendEmail(emailTemplates.SUBSCRIPTION_CREATE, user.email as string, [
        //   {
        //     name: 'trial_period',
        //     content: `${TRIAL_PERIOD_DAYS}`,
        //   },
        //   {
        //     name: 'trial_price',
        //     content: (trialPrice / 100).toFixed(2),
        //   },
        //   {
        //     name: 'price',
        //     content: (price / 100).toFixed(2),
        //   },
        //   {
        //     name: 'currency_symbol',
        //     content: user.currency?.currencyForPay as string,
        //   },
        //   {
        //     name: 'period',
        //     content: `${chargePeriodDays}`,
        //   },
        //   {
        //     name: 'trial_end_date',
        //     content: getTrialEndDate(),
        //   },
        // ]),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          subscriptionId: tokenOnboardingData.subscription.id,
        },
      });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error?.message, code: error.code },
        { status: 500 },
      );
    }
  },
);
