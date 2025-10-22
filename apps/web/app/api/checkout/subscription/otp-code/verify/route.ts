import { convertSessionUserToCustomerBody } from "@/lib/auth";
import { setServerAuthSession } from "@/lib/auth/jwt-signin";
import { Session } from "@/lib/auth/utils";
import { prisma } from "@dub/prisma";
import { ECookieArg } from "core/interfaces/cookie.interface";
import { applyUserSession } from "core/services/cookie/user-session.service";
import { verifyConfirmationCode } from "core/services/token-hash.service";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const USER_NOT_FOUND =
  "User not found. Please check your email address and try again.";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { confirm_code, user_email } = await request.json();

  const cookieStore = cookies();

  const hashedCode = cookieStore.get(ECookieArg.CONFIRM_CODE)?.value;

  try {
    if (!hashedCode || !confirm_code) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid code",
          // error: tCancellation('error_invalid_code')
        },
        { status: 401 },
      );
    }

    const isCodeValid = await verifyConfirmationCode(
      hashedCode,
      confirm_code,
      5,
    );

    if (!isCodeValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid code",
        },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email: user_email,
      },
    });

    if (!user) {
      return NextResponse.json(
        { status: 404, success: false, error: USER_NOT_FOUND },
        { status: 404 },
      );
    }

    const convertedUser = convertSessionUserToCustomerBody(
      user as Session["user"],
    );
    await setServerAuthSession(user.id);
    await applyUserSession({ ...convertedUser });

    cookieStore.delete(ECookieArg.CONFIRM_CODE);

    return NextResponse.json({
      success: true,
      data: {
        user_id: user?.id,
      },
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
