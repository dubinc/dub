import { cookies, headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { v4 as uuidV4 } from "uuid";

import { ICreateSessionBody } from "core/api/user/payment/payment.interface.ts";
import { getPaymentPlanPrice } from "core/integration/payment/config";
import {
  IUpdatePrimerClientSessionBody,
  PaymentService,
} from "core/integration/payment/server";
import { IDataRes } from "core/interfaces/common.interface.ts";
import { ECookieArg } from "core/interfaces/cookie.interface.ts";
import {
  getUserCookieService,
  updateUserCookieService,
} from "core/services/cookie/user-session.service.ts";
import { getUserIp } from "core/util/user-ip.util.ts";

const paymentService = new PaymentService();

// set user session
export async function POST(
  request: NextRequest,
): Promise<NextResponse<IDataRes>> {
  const { user } = await getUserCookieService();

  const body: ICreateSessionBody = await request.json();

  if (!user?.paymentInfo?.customerId && !user?.id) {
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 400 },
    );
  }

  try {
    const initialSubPlanName = "WEEK_PRICE";
    const { priceForPay } = getPaymentPlanPrice({
      paymentPlan: "PRICE_YEAR",
      user,
    });

    const headerStore = await headers();
    const cookieStore = await cookies();

    const metadata: { [key: string]: string | number | null } = {
      ...body.metadata,
      ...user.sessions,
      app_version: "v1",
      user_id: user.id || cookieStore.get(ECookieArg.SESSION_ID)?.value || null,
      locale: user.locale || "en",
      ipAddress: getUserIp(headerStore)!,
      ...(user?.email ? { email: user.email } : {}),
      supabase_user_id:
        user.id || cookieStore.get(ECookieArg.SESSION_ID)?.value || null,
      mixpanel_user_id:
        user.id || cookieStore.get(ECookieArg.SESSION_ID)?.value || null,
      sub_user_id_primer: user?.paymentInfo?.customerId || null,
      sub_order_country: user.currency?.countryCode || null,
      subscriptionType: `APP_SUBSCRIPTION`,
      application: `${process.env.NEXT_PUBLIC_PAYMENT_ENV}`,

      plan_name: initialSubPlanName,
    };

    const { clientToken, clientTokenExpirationDate } =
      await paymentService.createClientPaymentSession({
        orderId: uuidV4().replace(/-/g, "").slice(0, 22),
        customerId:
          user.id ||
          cookieStore.get(ECookieArg.SESSION_ID)?.value ||
          user.paymentInfo?.customerId ||
          "",
        currencyCode: user.currency?.currencyForPay || "",
        amount: priceForPay,
        order: {
          lineItems: [
            {
              itemId: uuidV4(),
              amount: priceForPay,
              quantity: 1,
            },
          ],
          countryCode: user.currency?.countryCode || "",
        },
        paymentMethod: {
          vaultOnSuccess: true,
          vaultOn3DS: true,
          paymentType: "FIRST_PAYMENT",
          orderedAllowedCardNetworks: [
            "VISA",
            "MASTERCARD",
            "DINERS_CLUB",
            "UNIONPAY",
          ],
        },
        customer: {
          ...(user?.email ? { emailAddress: user.email } : {}),
          billingAddress: { countryCode: user.currency?.countryCode || "" },
          shippingAddress: { countryCode: user.currency?.countryCode || "" },
        },
        metadata: { ...metadata },
      });

    await updateUserCookieService({
      paymentInfo: { clientToken, clientTokenExpirationDate },
    });

    return NextResponse.json({
      success: true,
      data: { clientToken, clientTokenExpirationDate },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message },
      { status: 500 },
    );
  }
}

// update client session
export async function PATCH(
  request: NextRequest,
): Promise<NextResponse<IDataRes>> {
  const { user } = await getUserCookieService();

  if (!user?.id) {
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 400 },
    );
  }

  try {
    const body: IUpdatePrimerClientSessionBody = await request.json();

    await paymentService.updateClientPaymentSession(body);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message },
      { status: 500 },
    );
  }
}
