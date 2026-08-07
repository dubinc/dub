import { prisma } from "@/lib/prisma";
import { sendEmail } from "@dub/email";
import ConfirmEmailChange from "@dub/email/templates/confirm-email-change";
import { waitUntil } from "@vercel/functions";
import { DubApiError } from "../api/errors";
import { buildLookupKey } from "../better-auth/utils";
import { createVerificationToken } from "../better-auth/verification-token";
import { isEmailDomainBlocked } from "../email/is-email-domain-blocked";
import { isGenericEmail } from "../email/is-generic-email";
import { assertRateLimit } from "../upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "../upstash/ratelimit-policies";

const EMAIL_CHANGE_MIN_ACCOUNT_AGE_MS = 60 * 60 * 1000; // 1 hour

// Send the OTP to confirm the email address change for existing users/partners
export const requestEmailChange = async ({
  email,
  newEmail,
  identifier,
  userId,
  isPartnerProfile = false,
  syncIdentity = false,
  partnerId,
  redirectTo,
  hostName,
}: {
  email: string;
  newEmail: string;
  identifier: string;
  userId: string;
  isPartnerProfile?: boolean; // If true, the email is being changed for a partner profile
  syncIdentity?: boolean; // If true, update both user and partner email on confirm
  partnerId?: string;
  redirectTo?: "/profile" | "/account/settings";
  hostName: string;
}) => {
  if (syncIdentity && !partnerId) {
    throw new DubApiError({
      code: "bad_request",
      message: "Partner ID is required when syncing identity.",
    });
  }

  await assertRateLimit({
    policy: RATELIMIT_POLICIES.emailChangeRequest,
    identifier: userId,
  });

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      createdAt: true,
    },
  });

  if (!user) {
    throw new DubApiError({
      code: "not_found",
      message: "User not found.",
    });
  }

  const isAccountTooNew =
    Date.now() - user.createdAt.getTime() < EMAIL_CHANGE_MIN_ACCOUNT_AGE_MS;

  if (isAccountTooNew) {
    throw new DubApiError({
      code: "forbidden",
      message:
        "This action is temporarily unavailable for your account. Please try again later or contact support at dub.co/support",
    });
  }

  await assertRateLimit({
    policy: RATELIMIT_POLICIES.emailChangeRequestTarget,
    identifier: newEmail.toLowerCase(),
  });

  const isGenericEmailWithPlus = email.includes("+") && isGenericEmail(email);
  const emailDomainBlocked = await isEmailDomainBlocked(newEmail);
  if (isGenericEmailWithPlus || emailDomainBlocked) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "Invalid email address – please use your work email instead. If you think this is a mistake, please contact us at dub.co/support",
    });
  }

  const { token } = await createVerificationToken({
    kind: "emailChange",
    value: {
      ownerId: identifier,
      currentEmail: email,
      newEmail,
      ...(isPartnerProfile && { isPartnerProfile }),
      ...(syncIdentity && { syncIdentity, partnerId }),
      ...(redirectTo && { redirectTo }),
    },
    lookupKey: buildLookupKey("email-change", identifier),
    removePreviousTokens: true,
  });

  waitUntil(
    sendEmail({
      subject: "Confirm your email address change",
      to: newEmail,
      react: ConfirmEmailChange({
        email,
        newEmail,
        confirmUrl: `${hostName}/auth/confirm-email-change/${token}`,
      }),
    }),
  );
};
