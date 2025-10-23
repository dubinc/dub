import { CUSTOMER_IO_TEMPLATES, sendEmail } from '@dub/email';
import { prisma } from "@dub/prisma";
import { PaymentService } from "core/integration/payment/server";
import { ECookieArg } from "core/interfaces/cookie.interface";
import { updateUserCookieService } from "core/services/cookie/user-session.service";
import { generateHashedConfirmationCode } from "core/services/token-hash.service";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const SUBSCRIPTION_CANCELLED = "subscription_cancelled";
export const USER_NOT_FOUND = "user_not_found";

const paymentModule = new PaymentService();

export async function POST(request: NextRequest): Promise<NextResponse> {
  const cookieStore = cookies();

  const { email } = await request.json();

  if (!email) {
    return NextResponse.json(
      {
        success: false,
        error: "Email is required",
      },
      { status: 400 },
    );
  }

  try {
    const { hasAccessToApp, isCancelled } =
      await paymentModule.checkClientSubscriptionStatus({
        email,
      });

    if (!hasAccessToApp) {
      const errorCode = isCancelled ? SUBSCRIPTION_CANCELLED : USER_NOT_FOUND;
      const statusCode = isCancelled ? 403 : 404;

      return NextResponse.json(
        {
          success: false,
          error: errorCode,
        },
        { status: statusCode },
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user || !user?.email || !user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 },
      );
    }

    const confirmationCode = await generateHashedConfirmationCode();
    cookieStore.set(ECookieArg.CONFIRM_CODE, confirmationCode.hashedToken, {
      maxAge: 5 * 60,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    await updateUserCookieService({ email });

    if (process.env.NODE_ENV === "development") {
      console.log(
        "[Cancellation flow]: User verification code: ",
        confirmationCode.code.toString(),
      );
    }

    await sendEmail({
      email: user.email,
      subject: "Subscription Cancellation OTP",
      template: CUSTOMER_IO_TEMPLATES.CANCELLATION_OTP,
      messageData: {
        code: confirmationCode.code.toString(),
      },
      customerId: user.id,
    });

    return NextResponse.json({
      success: true,
      // data: {
      //   user_id: user?.id,
      // },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message.replace(
          process.env.NEXT_PUBLIC_SYSTEM_PAYMENT_API_URL,
          "",
        ),
      },
      { status: 500 },
    );
  }
}
