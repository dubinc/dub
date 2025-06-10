// get user profile
import { IUserProfileRes } from "core/api/user/user.interface.ts";
import { ICustomerBody } from "core/integration/payment/config";
import { IDataRes } from "core/interfaces/common.interface.ts";
import {
  getUserCookieService,
  updateUserCookieService,
} from "core/services/cookie/user-session.service.ts";
import { NextRequest, NextResponse } from "next/server";

export async function GET(): Promise<
  NextResponse<Omit<IUserProfileRes, "sessions">>
> {
  try {
    const { user } = await getUserCookieService();

    const data = structuredClone(user);
    delete data?.iat;
    delete data?.ip;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message },
      { status: 500 },
    );
  }
}

// update user profile
export async function PATCH(req: NextRequest): Promise<NextResponse<IDataRes>> {
  try {
    const body: Partial<ICustomerBody> = await req.json();

    await updateUserCookieService(body);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message },
      { status: 500 },
    );
  }
}
