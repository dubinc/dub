import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { getSession } from "@/lib/auth";
import { paypalOAuth } from "@/lib/paypal/oauth";
import { prisma } from "@dub/prisma";
import { getSearchParams } from "@dub/utils";
import { redirect } from "next/navigation";
import { z } from "zod";

const oAuthCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
});

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
      `http://partners.localhost:8888/api/paypal/callback?${searchParams.toString()}`,
    );
  }

  try {
    if (!session?.user.id) {
      throw new DubApiError({
        code: "unauthorized",
        message:
          "Unauthorized. You must be logged in https://partners.dub.co to continue.",
      });
    }

    const { defaultPartnerId } = session.user;

    if (!defaultPartnerId) {
      throw new DubApiError({
        code: "not_found",
        message: "Partner profile not found.",
      });
    }

    const { code, state } = oAuthCallbackSchema.parse(getSearchParams(req.url));

    const isStateValid = await paypalOAuth.verifyState({
      state,
      dubUserId: session.user.id,
    });

    if (!isStateValid) {
      throw new DubApiError({
        code: "bad_request",
        message: "Invalid state",
      });
    }

    const accessToken = await paypalOAuth.exchangeCodeForToken({
      code,
    });

    const paypalUser = await paypalOAuth.getUserInfo({
      token: accessToken,
    });

    // TODO:
    // Should we check if the paypal email is verified?

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
  } catch (e: any) {
    return handleAndReturnErrorResponse(e);
  }

  redirect("/settings/payouts");
};
