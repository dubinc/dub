import { getSession } from "@/lib/auth";
import { paypalOAuthProvider } from "@/lib/paypal/oauth";
import { prisma } from "@dub/prisma";
import { PARTNERS_DOMAIN } from "@dub/utils";
import { redirect } from "next/navigation";

// GET /api/paypal/callback - callback from PayPal
export const GET = async (req: Request) => {
  const session = await getSession();
  const { searchParams } = new URL(req.url);

  // Local development redirect since the callback might be coming through ngrok
  if (
    process.env.NODE_ENV === "development" &&
    !req.headers.get("host")?.includes("localhost")
  ) {
    return redirect(
      `${PARTNERS_DOMAIN}/api/paypal/callback?${searchParams.toString()}`,
    );
  }

  if (!session?.user.id) {
    redirect(`${PARTNERS_DOMAIN}/login`);
  }

  let error: string | null = null;

  try {
    const { defaultPartnerId } = session.user;

    if (!defaultPartnerId) {
      throw new Error("partner_not_found");
    }

    const { token, contextId } =
      await paypalOAuthProvider.exchangeCodeForToken<string>(req);

    await prisma.user.findUniqueOrThrow({
      where: {
        id: contextId,
      },
    });

    const paypalUser = await paypalOAuthProvider.getUserInfo(
      token.access_token,
    );

    if (!paypalUser.email_verified) {
      throw new Error("paypal_email_not_verified");
    }

    const { partner } = await prisma.partnerUser.findUniqueOrThrow({
      where: {
        userId_partnerId: {
          userId: session.user.id,
          partnerId: defaultPartnerId,
        },
      },
      include: {
        partner: true,
      },
    });

    await prisma.partner.update({
      where: {
        id: defaultPartnerId,
      },
      data: {
        paypalEmail: paypalUser.email,
        ...(!partner.payoutsEnabledAt && {
          payoutsEnabledAt: new Date(),
        }),
      },
    });

    // TODO:
    // Send an email to the partner to inform them that their PayPal account has been connected
  } catch (e) {
    console.error(e);

    if (e instanceof Error) {
      error = e.message;
    }
  }

  redirect(
    `/settings/payouts${error ? `?error=${encodeURIComponent(error)}` : ""}`,
  );
};
