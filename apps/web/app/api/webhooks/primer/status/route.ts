import { createAutoLoginURL } from "@/lib/auth/jwt-signin";
import { CUSTOMER_IO_TEMPLATES, sendEmail } from "@dub/email";
import { prisma } from "@dub/prisma";
import { NextRequest, NextResponse } from "next/server";

type PaymentStatus =
  | "PENDING"
  | "FAILED"
  | "AUTHORIZED"
  | "SETTLING"
  | "PARTIALLY_SETTLED"
  | "SETTLED"
  | "DECLINED"
  | "CANCELLED";

type PaymentRequest = {
  payment: {
    metadata: {
      mixpanel_user_id?: string;
      email_address?: string;
      email?: string;
      plan_name?: string;
      payment_subtype?: string;
    };
    customer: { emailAddress?: string };
    status: PaymentStatus;
    currencyCode: string;
    amount: number;
  };
};

interface IDataRes {
  success: boolean;
  error?: string | null;
  code?: string | null;
}

const FAILED_STATUSES = ["FAILED", "DECLINED"];

const titlesByPlans = {
  PRICE_MONTH_PLAN: "Monthly Plan",
  PRICE_QUARTER_PLAN: "3-Month Plan",
  PRICE_YEAR_PLAN: "12-Month Plan",
};

export async function POST(req: NextRequest): Promise<NextResponse<IDataRes>> {
  try {
    const body: PaymentRequest = await req.json();

    console.log("Primer status");
    console.log(body);

    const email =
      body.payment.metadata.email_address ||
      body.payment.metadata.email ||
      body.payment.customer.emailAddress;

    if (!FAILED_STATUSES.includes(body.payment.status)) {
      return NextResponse.json({ success: true });
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

    if (!user?.email) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    const loginUrl = await createAutoLoginURL(user.id, "/account/plans");

    if (body.payment.metadata.payment_subtype === "FIRST_PAYMENT") {
      await sendEmail({
        email: user.email,
        subject: "Failed Trial Payment",
        template: CUSTOMER_IO_TEMPLATES.FAILED_TRIAL,
        messageData: {
          new_plan: titlesByPlans[body.payment.metadata.plan_name as string],
          url: loginUrl,
        },
        customerId: user.id,
      });

      return NextResponse.json({ success: true });
    }

    await sendEmail({
      email: user.email,
      subject: "Failed Payment",
      template: CUSTOMER_IO_TEMPLATES.FAILED_PAYMENT,
      messageData: {
        new_plan: titlesByPlans[body.payment.metadata.plan_name as string],
        url: loginUrl,
      },
      customerId: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message },
      { status: 500 },
    );
  }
}
