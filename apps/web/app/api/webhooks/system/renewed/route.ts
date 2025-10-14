import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@dub/prisma';
import { CUSTOMER_IO_TEMPLATES, sendEmail } from '@dub/email';
import { format } from 'date-fns';
import { CustomerIOClient } from 'core/lib/customerio/customerio.config';

interface IDataRes {
  success: boolean;
  error?: string | null;
  code?: string | null;
}

export async function POST(req: NextRequest): Promise<NextResponse<IDataRes>> {
  try {
    const body = await req.json();

    console.log('renewed');
    console.log(body);

    const email = body.subscription?.attributes?.email || body.user?.email;
    const nextBillingDate = body.subscription?.nextBillingDate;
    const changeType = body.type;

    if (changeType !== 'renewed') {
      return NextResponse.json({ success: false, error: 'Bad request' }, { status: 400 });
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
        { success: false, error: 'User not found' },
        { status: 404 },
      );
    }

    CustomerIOClient.track(user.id, {
      name: 'subscription_renew_success',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
