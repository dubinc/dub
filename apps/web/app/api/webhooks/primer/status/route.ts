import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@dub/prisma';
import { CUSTOMER_IO_TEMPLATES, sendEmail } from '@dub/email';

type PaymentStatus =
  | 'PENDING'
  | 'FAILED'
  | 'AUTHORIZED'
  | 'SETTLING'
  | 'PARTIALLY_SETTLED'
  | 'SETTLED'
  | 'DECLINED'
  | 'CANCELLED';

type PaymentRequest = {
  payment: {
    metadata: {
      locale: string;
      email_address?: string;
      email?: string;
      flow_type: string;
      entity_id?: string;
      paymentMethodType: string;
      subscriptionDetails?: {
        subscriptionId: string;
        chargePeriodDays: number;
        price: number;
      };
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

export async function POST(req: NextRequest): Promise<NextResponse<IDataRes>> {
  try {
    const body: PaymentRequest = await req.json();

    console.log('Primer status');
    console.log(body);

    const email =
      body.payment.metadata.email_address ||
      body.payment.metadata.email ||
      body.payment.customer.emailAddress;

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
        { success: false, error: 'User not found' },
        { status: 404 },
      );
    }

    // await sendEmail({
    //   email: user.email,
    //   subject: "Refunded",
    //   template: CUSTOMER_IO_TEMPLATES.REFUND,
    //   messageData: {
    //     refunded_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    //     refunded_amount:
    //       (body.payment.amount / 100).toFixed(2) + ' ' + body.payment.currencyCode,
    //     payment_method:
    //       body.payment.paymentMethod.paymentMethodData.network +
    //       ' ' +
    //       paymentMethodData.first6Digits +
    //       '** **** ' +
    //       paymentMethodData.last4Digits,
    //   },
    //   customerId: user.id,
    // });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
