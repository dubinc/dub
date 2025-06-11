import { cookies, headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { v4 as uuidV4 } from "uuid";

import { withSession } from "@/lib/auth";
import { ICreateSessionBody } from "core/api/user/payment/payment.interface.ts";
import {
  getPaymentPlanPrice,
  TPaymentPlan,
} from "core/integration/payment/config";
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
import { isBefore } from "date-fns/isBefore";
import { subHours } from "date-fns/subHours";

const paymentService = new PaymentService();

// set user session
export const POST = withSession(async (request) => {
  const { session: authSession } = request;
  const { user } = await getUserCookieService();

  if (!user?.paymentInfo?.customerId && !user?.id) {
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 400 },
    );
  }

  if (user?.paymentInfo?.clientToken) {
    if (
      isBefore(
        subHours(new Date(user.paymentInfo?.clientTokenExpirationDate ?? 0), 3),
        new Date(),
      )
    ) {
      const { clientToken, clientTokenExpirationDate } =
        await paymentService.updateClientPaymentSession({
          clientToken: user.paymentInfo.clientToken,
        });

      await updateUserCookieService({
        paymentInfo: { clientToken, clientTokenExpirationDate },
      });

      return NextResponse.json({
        success: true,
        data: {
          clientToken,
          clientTokenExpirationDate,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        clientToken: user.paymentInfo.clientToken,
        clientTokenExpirationDate: user.paymentInfo.clientTokenExpirationDate,
      },
    });
  }

  try {
    const initialSubPlanName: TPaymentPlan = "PRICE_YEAR_PLAN";
    const { priceForPay } = getPaymentPlanPrice({
      paymentPlan: initialSubPlanName,
      user,
    });

    const headerStore = headers();
    const cookieStore = cookies();

    const metadata: { [key: string]: string | number | null } = {
      ...(request as ICreateSessionBody).metadata,
      ...user.sessions,
      app_version: "v1",
      user_id:
        authSession.user.id ||
        cookieStore.get(ECookieArg.SESSION_ID)?.value ||
        null,
      ipAddress: getUserIp(headerStore)!,
      email: request.session.user.email,
      mixpanel_user_id:
        request.session.user.id ||
        cookieStore.get(ECookieArg.SESSION_ID)?.value ||
        null,
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
          authSession.user.id ||
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
          emailAddress: authSession.user.email,
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
});

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

    const { clientToken, clientTokenExpirationDate } =
      await paymentService.updateClientPaymentSession(body);

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
