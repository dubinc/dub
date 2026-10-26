import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { VerificationToken } from "@prisma/client";
import { hashToken } from "./hash-token";

export type EmailChangeAuthErrorReason = "invalid_token";

const EMAIL_CHANGE_AUTH_ERROR_MESSAGES: Record<
  EmailChangeAuthErrorReason,
  string
> = {
  invalid_token: "This token is invalid. Please request a new one.",
};

export class EmailChangeAuthError extends Error {
  readonly reason: EmailChangeAuthErrorReason;

  constructor(reason: EmailChangeAuthErrorReason) {
    super(EMAIL_CHANGE_AUTH_ERROR_MESSAGES[reason]);
    this.name = "EmailChangeAuthError";
    this.reason = reason;
  }
}

export type EmailChangeRequestData = {
  email: string;
  newEmail: string;
};

export async function deleteEmailChangeRequest(token: string) {
  const hashedToken = await hashToken(token, { secret: true });

  try {
    await Promise.allSettled([
      prisma.verificationToken.delete({
        where: {
          token: hashedToken,
        },
      }),

      redis.del(`email-change-request:token:${hashedToken}`),
    ]);
  } catch {}
}

export async function assertCanConfirmEmailChange({
  userId,
  tokenFound,
}: {
  userId: string;
  tokenFound: Pick<VerificationToken, "identifier">;
}) {
  if (tokenFound.identifier !== userId) {
    throw new EmailChangeAuthError("invalid_token");
  }
}
