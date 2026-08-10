"use server";

import { assertCanConfirmEmailChange } from "@/lib/auth/assert-can-confirm-email-change";
import { syncPlainCustomerEmail } from "@/lib/plain/upsert-plain-customer";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@dub/email";
import EmailUpdated from "@dub/email/templates/email-updated";
import { waitUntil } from "@vercel/functions";
import { flattenValidationErrors } from "next-safe-action";
import * as z from "zod/v4";
import {
  consumeVerificationToken,
  findVerificationToken,
} from "../better-auth/verification-token";
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

    const verification = await findVerificationToken({
      kind: "emailChange",
      identifier: token,
    });

    if (!verification || verification.isExpired) {
      throw new Error(
        "This token is invalid or expired. Please request a new one.",
      );
    }

    await assertCanConfirmEmailChange({
      userId: user.id,
      data: verification.value,
    });

    const consumed = await consumeVerificationToken({
      kind: "emailChange",
      identifier: token,
    });

    if (!consumed) {
      throw new Error(
        "This token is invalid or expired. Please request a new one.",
      );
    }

    const {
      ownerId,
      currentEmail,
      newEmail,
      isPartnerProfile,
      syncIdentity,
      partnerId,
      redirectTo,
    } = verification.value;

    // Sync identity: Sync the email to the partner profile
    if (syncIdentity) {
      await prisma.$transaction([
        prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            email: newEmail,
          },
        }),

        prisma.partner.update({
          where: {
            id: partnerId,
          },
          data: {
            email: newEmail,
          },
        }),
      ]);
    }

    // Update the partner profile email
    else if (isPartnerProfile) {
      await prisma.partner.update({
        where: {
          id: ownerId,
        },
        data: {
          email: newEmail,
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
          email: newEmail,
        },
      });
    }

    const shouldSyncPlainCustomerEmail = !!syncIdentity || !isPartnerProfile;

    waitUntil(
      Promise.allSettled([
        sendEmail({
          subject: "Your email address has been changed",
          to: currentEmail,
          react: EmailUpdated({
            oldEmail: currentEmail,
            newEmail: newEmail,
            isPartnerProfile: !!isPartnerProfile,
            syncIdentity: !!syncIdentity,
          }),
        }),

        ...(shouldSyncPlainCustomerEmail
          ? [
              syncPlainCustomerEmail({
                id: user.id,
                name: user.name ?? null,
                email: newEmail,
                oldEmail: currentEmail,
              }),
            ]
          : []),
      ]),
    );

    return {
      redirectTo:
        redirectTo ?? (isPartnerProfile ? "/profile" : "/account/settings"),
    };
  });
