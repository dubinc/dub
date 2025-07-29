import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { withSession } from "@/lib/auth";
import {
  ICreatePaymentBody,
  ICreatePaymentRes,
} from "core/api/user/payment/payment.interface.ts";
import {
  getPaymentPlanPrice,
  TPaymentPlan,
} from "core/integration/payment/config";
import { PaymentService } from "core/integration/payment/server";
import { ECookieArg } from "core/interfaces/cookie.interface.ts";
import { getUserCookieService } from "core/services/cookie/user-session.service.ts";
import { getUserIp } from "core/util/user-ip.util.ts";
import { v4 as uuidV4 } from "uuid";
import { getSubscriptionRenewalAction } from "../../../../core/constants/subscription-plans-weight.ts";

const paymentService = new PaymentService();

const allowedPaymentPlans: Partial<TPaymentPlan>[] = [
  "PRICE_MONTH_PLAN",
  "PRICE_QUARTER_PLAN",
  "PRICE_YEAR_PLAN",
];

// create one time payment
export const POST = withSession(
  async ({
    req,
    session: authSession,
  }): Promise<NextResponse<ICreatePaymentRes>> => {
    const body: ICreatePaymentBody = await req.json();

    const user = authSession?.user;
    const paymentData = user?.paymentData;

    if (!user || !paymentData?.paymentInfo?.customerId) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 400 },
      );
    }

    if (!body.paymentPlan) {
      return NextResponse.json(
        { success: false, error: "Payment plan is required" },
        { status: 400 },
      );
    }
    if (!allowedPaymentPlans.includes(body.paymentPlan)) {
      return NextResponse.json(
        { success: false, error: "Payment plan not found" },
        { status: 400 },
      );
    }

    const headerStore = headers();
    const cookieStore = cookies();

    const subProcessorData = await paymentService.getProcessorByCustomerId(
      user!.id! || cookieStore.get(ECookieArg.SESSION_ID)!.value!,
    );

    const metadata: { [key: string]: string | number | null } = {
      ...body.metadata,

      //**** antifraud sessions ****//
      ...(paymentData?.sessions && { ...paymentData.sessions }),

      //**** for analytics ****//
      email: user.email || null,
      flow_type: "internal",
      locale: "en",
      mixpanel_user_id:
        user.id || cookieStore.get(ECookieArg.SESSION_ID)?.value || null,
      // plan_name: paymentData?.paymentInfo?.subscriptionPlanCode as string,
      plan_name: body.paymentPlan,
      payment_subtype: "SUBSCRIPTION",
      billing_action:
        getSubscriptionRenewalAction(
          body.paymentPlan,
          paymentData?.paymentInfo?.subscriptionPlanCode,
        ) || "upgrade",
      //**** for analytics ****//

      //**** fields for subscription system ****//
      sub_user_id_primer: paymentData?.paymentInfo?.customerId || null,
      sub_order_country: paymentData.currency?.countryCode || null,
      ipAddress: getUserIp(headerStore)!,
      subscriptionType: "APP_SUBSCRIPTION",
      application: `${process.env.NEXT_PUBLIC_PAYMENT_ENV}`,
      ...subProcessorData,
      //**** fields for subscription system ****//
    };

    const { user: cookieUser } = await getUserCookieService();
    const { priceForPay } = getPaymentPlanPrice({
      paymentPlan: body.paymentPlan,
      user: cookieUser,
    });

    try {
      const { id, status } = await paymentService.createClientOneTimePayment({
        orderId: uuidV4().replace(/-/g, "").slice(0, 22),
        customerId: user.id || paymentData?.paymentInfo?.customerId || "",
        paymentMethodToken: paymentData?.paymentInfo?.paymentMethodToken || "",
        currencyCode: paymentData?.currency?.currencyForPay || "",
        amount: priceForPay,
        order: {
          lineItems: [
            { amount: priceForPay, description: body.paymentPlan, quantity: 1 },
          ],
          countryCode: paymentData?.currency?.countryCode || "",
        },
        paymentMethod: { paymentType: "SUBSCRIPTION" },
        customer: {
          emailAddress: user?.email,
          billingAddress: {
            countryCode: paymentData?.currency?.countryCode || "",
          },
          shippingAddress: {
            countryCode: paymentData?.currency?.countryCode || "",
          },
        },
        metadata,
      });

      return NextResponse.json({
        success: true,
        data: { paymentId: id, status },
      });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error?.message },
        { status: 500 },
      );
    }
  },
);
