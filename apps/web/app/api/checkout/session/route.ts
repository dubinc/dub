import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { v4 as uuidV4 } from "uuid";

import { Session, withSession } from "@/lib/auth";
import {
  getPaymentPlanPrice,
  ICustomerBody,
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

const getMetadata = ({
  session,
  user,
  paymentPlan,
}: {
  session: Session;
  user: ICustomerBody;
  paymentPlan: TPaymentPlan;
}) => {
  const headerStore = headers();
  const cookieStore = cookies();

  const metadata: { [key: string]: string | number | null } = {
    //**** antifraud sessions ****//
    ...user.sessions,

    //**** for analytics ****//
    email: session.user.email,
    flow_type: "internal",
    locale: "en",
    mixpanel_user_id:
      session.user.id || cookieStore.get(ECookieArg.SESSION_ID)?.value || null,
    plan_name: paymentPlan,
    //**** for analytics ****//

    //**** fields for subscription system ****//
    sub_user_id_primer: user?.paymentInfo?.customerId || null,
    sub_order_country: user.currency?.countryCode || null,
    ipAddress: getUserIp(headerStore)!,
    subscriptionType: `APP_SUBSCRIPTION`,
    application: `${process.env.NEXT_PUBLIC_PAYMENT_ENV}`,
    //**** fields for subscription system ****//
  };

  return metadata;
};

// set user session
export const POST = withSession(async ({ req, session: authSession }) => {
  const { user } = await getUserCookieService();

  const initialSubPaymentPlan: TPaymentPlan = "PRICE_YEAR_PLAN";

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
          paymentPlan: initialSubPaymentPlan,
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
    const body = await req.json();

    const { priceForPay } = getPaymentPlanPrice({
      paymentPlan: initialSubPaymentPlan,
      user,
    });

    const cookieStore = cookies();

    const metadata = {
      ...body.metadata,
      ...getMetadata({
        session: authSession,
        user,
        paymentPlan: initialSubPaymentPlan,
      }),
    };

    const filteredMetadata = Object.fromEntries(
      Object.entries(metadata).filter(([_, value]) => value !== undefined),
    ) as { [key: string]: string | number | boolean | null };

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
        metadata: { ...filteredMetadata },
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
export const PATCH = withSession(
  async ({ req, session: authSession }): Promise<NextResponse<IDataRes>> => {
    const { user } = await getUserCookieService();

    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 400 },
      );
    }

    try {
      const body: IUpdatePrimerClientSessionBody = await req.json();

      const metadata = {
        ...body.metadata,
        ...getMetadata({
          session: authSession,
          user,
          paymentPlan: body.paymentPlan,
        }),
      };

      const { clientToken, clientTokenExpirationDate } =
        await paymentService.updateClientPaymentSession({ ...body, metadata });

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
  },
);
