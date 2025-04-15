import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { getSession } from "@/lib/auth";
import {
  exchangeCodeForToken,
  getUserInfo,
  verifyState,
} from "@/lib/paypal/oauth";
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

  try {
    if (!session?.user.id) {
      throw new DubApiError({
        code: "unauthorized",
        message:
          "Unauthorized. You must be logged in https://partners.dub.co/ to continue.",
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

    const isStateValid = await verifyState({
      state,
      dubUserId: session.user.id,
    });

    if (!isStateValid) {
      throw new DubApiError({
        code: "bad_request",
        message: "Invalid state",
      });
    }

    const accessToken = await exchangeCodeForToken({
      code,
    });

    const paypalUser = await getUserInfo({
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

  // TODO:
  // Maybe redirect to /success?method=paypal

  redirect("/programs");
};
