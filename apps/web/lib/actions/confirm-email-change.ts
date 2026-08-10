"use server";

import { hashToken } from "@/lib/auth";
import {
  assertCanConfirmEmailChange,
  EmailChangeRequestData,
} from "@/lib/auth/confirm-email-change";
import { syncPlainCustomerEmail } from "@/lib/plain/upsert-plain-customer";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { sendEmail } from "@dub/email";
import EmailUpdated from "@dub/email/templates/email-updated";
import { waitUntil } from "@vercel/functions";
import { flattenValidationErrors } from "next-safe-action";
import * as z from "zod/v4";
import { authUserActionClient } from "./safe-action";

const confirmEmailChangeSchema = z.object({
  token: z.string().min(1),
});

export const confirmEmailChangeAction = authUserActionClient
  .inputSchema(confirmEmailChangeSchema, {
    handleValidationErrorsShape: async (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .action(async ({ parsedInput, ctx }) => {
    const { token } = parsedInput;
    const { user } = ctx;

    const tokenFound = await prisma.verificationToken.findUnique({
      where: {
        token: await hashToken(token, { secret: true }),
      },
      select: {
        identifier: true,
        token: true,
        expires: true,
      },
    });

    if (!tokenFound || tokenFound.expires < new Date()) {
      throw new Error(
        "This token is invalid or expired. Please request a new one.",
      );
    }

    const data = await redis.get<EmailChangeRequestData>(
      `email-change-request:token:${tokenFound.token}`,
    );

    if (!data) {
      throw new Error(
        "This token is invalid or expired. Please request a new one.",
      );
    }

    await assertCanConfirmEmailChange({
      userId: user.id,
      tokenFound,
      data,
    });

    // Consume the token before mutating so concurrent confirms fail closed
    const deleted = await prisma.verificationToken.deleteMany({
      where: {
        token: tokenFound.token,
        expires: {
          gte: new Date(),
        },
      },
    });

    if (deleted.count !== 1) {
      throw new Error(
        "This token is invalid or expired. Please request a new one.",
      );
    }

    const tokenIdentifier = tokenFound.identifier;

    // Sync identity: Sync the email to the partner profile
    if (data.syncIdentity) {
      await prisma.$transaction([
        prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            email: data.newEmail,
          },
        }),

        prisma.partner.update({
          where: {
            id: data.partnerId!,
          },
          data: {
            email: data.newEmail,
          },
        }),
      ]);
    }

    // Update the partner profile email
    else if (data.isPartnerProfile) {
      await prisma.partner.update({
        where: {
          id: tokenIdentifier,
        },
        data: {
          email: data.newEmail,
        },
      });
    }

    // Update the user email
    else {
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          email: data.newEmail,
        },
      });
    }

    const shouldSyncPlainCustomerEmail =
      !!data.syncIdentity || !data.isPartnerProfile;

    waitUntil(
      Promise.allSettled([
        sendEmail({
          subject: "Your email address has been changed",
          to: data.email,
          react: EmailUpdated({
            oldEmail: data.email,
            newEmail: data.newEmail,
            isPartnerProfile: !!data.isPartnerProfile,
            syncIdentity: !!data.syncIdentity,
          }),
        }),

        ...(shouldSyncPlainCustomerEmail
          ? [
              syncPlainCustomerEmail({
                id: user.id,
                name: user.name ?? null,
                email: data.newEmail,
                oldEmail: data.email,
              }),
            ]
          : []),

        redis.del(`email-change-request:token:${tokenFound.token}`),
      ]),
    );

    return {
      isPartnerProfile: !!data.isPartnerProfile,
      redirectTo: data.redirectTo,
    };
  });
