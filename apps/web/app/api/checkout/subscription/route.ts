import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { withSession } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import {
  ICreateSubscriptionBody,
  ICreateSubscriptionRes,
} from "core/api/user/subscription/subscription.interface.ts";
import {
  getChargePeriodDaysIdByPlan,
  getPaymentPlanPrice,
} from "core/integration/payment/config";
import { PaymentService } from "core/integration/payment/server";
import { ECookieArg } from "core/interfaces/cookie.interface.ts";
import { updateUserCookieService } from "core/services/cookie/user-session.service.ts";
import { getUserIp } from "core/util/user-ip.util.ts";
import { CUSTOMER_IO_TEMPLATES, sendEmail } from '@dub/email';

const paymentService = new PaymentService();

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
            email: user.email || authSession.user.email || "",
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

      if (
        !tokenOnboardingData ||
        !tokenOnboardingData.subscription ||
        !tokenOnboardingData.subscription.id
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Failed to create subscription: invalid response from payment system",
          },
          { status: 500 },
        );
      }

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

      console.log(body.paymentPlan);
      console.log(price);
      console.log(user.currency?.currencyForPay);

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
        await sendEmail({
          email: user.email || authSession.user.email,
          subject: "Welcome to GetQR",
          template: CUSTOMER_IO_TEMPLATES.SUBSCRIPTION_ACTIVE,
          messageData: {
            period: '1 month',
            price: '100',
            currency: 'USD',
            next_billing_date: '2025-07-01',
          },
        }),
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
