import { prisma } from "@/lib/prisma";
import { sendEmail } from "@dub/email";
import ConfirmEmailChange from "@dub/email/templates/confirm-email-change";
import { waitUntil } from "@vercel/functions";
import { randomBytes } from "crypto";
import { hashToken } from ".";
import { DubApiError } from "../api/errors";
import { isEmailDomainBlocked } from "../email/is-email-domain-blocked";
import { isGenericEmail } from "../is-generic-email";
import { assertRateLimit, redis } from "../upstash";
import { RATELIMIT_POLICIES } from "../upstash/ratelimit-policies";

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

  // Remove existing verification tokens
  await prisma.verificationToken.deleteMany({
    where: {
      identifier,
    },
  });

  const token = randomBytes(32).toString("hex");
  const hashedToken = await hashToken(token, { secret: true });
  const expiresIn = 15 * 60 * 1000;

  // Create a new verification token
  await prisma.verificationToken.create({
    data: {
      identifier,
      token: hashedToken,
      expires: new Date(Date.now() + expiresIn),
    },
  });

  // Set the email change request in Redis, we'll use this to verify the email change in /auth/confirm-email-change/[token]
  await redis.set(
    `email-change-request:token:${hashedToken}`,
    {
      email,
      newEmail,
      ...(isPartnerProfile && { isPartnerProfile }),
      ...(syncIdentity && { syncIdentity, partnerId }),
      ...(redirectTo && { redirectTo }),
    },
    {
      px: expiresIn,
    },
  );

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
