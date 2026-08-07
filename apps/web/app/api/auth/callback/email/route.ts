import { hashToken } from "@/lib/auth";
import { buildMagicLinkUrl } from "@/lib/better-auth/utils";
import { createVerificationToken } from "@/lib/better-auth/verification-token";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN, PARTNERS_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";

const TRUSTED_CALLBACK_ORIGINS = new Set([
  new URL(APP_DOMAIN).origin,
  new URL(PARTNERS_DOMAIN).origin,
]);

/**
 * Legacy NextAuth email callback → Better Auth magic-link bridge.
 *
 * Old route (still in already-sent invite / login emails):
 *   GET /api/auth/callback/email?email=...&token=...&callbackUrl=...
 *   - token is stored hashed in VerificationToken (NextAuth table)
 *   - login and invite links share this URL shape (no invite flag on the token)
 *
 * New route (used by createInviteMagicLink / magic-link login):
 *   GET /api/auth/magic-link/verify?token=...&callbackURL=...
 *   - token is stored in Verification (Better Auth table)
 *   - invite vs login is marked on the Verification value (`isInvite: true`)
 *
 * This handler validates + consumes VerificationToken, then mints a BA
 * Verification. Invite vs login is inferred from a pending ProjectInvite /
 * PartnerInvite for that email (old tokens had no invite flag).
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const email = requestUrl.searchParams.get("email")?.trim().toLowerCase();
  const token = requestUrl.searchParams.get("token");
  const callbackUrl = requestUrl.searchParams.get("callbackUrl") ?? "/";

  const errorRedirect = new URL("/login", requestUrl.origin);
  errorRedirect.searchParams.set("error", "invalid_token");

  if (!email || !token) {
    return NextResponse.redirect(errorRedirect);
  }

  const hashedToken = await hashToken(token, { secret: true });

  const verificationToken = await prisma.verificationToken.findUnique({
    where: {
      token: hashedToken,
    },
  });

  if (
    !verificationToken ||
    verificationToken.expires < new Date() ||
    verificationToken.identifier.toLowerCase() !== email
  ) {
    return NextResponse.redirect(errorRedirect);
  }

  await prisma.verificationToken.delete({
    where: {
      token: hashedToken,
    },
  });

  const [projectInvite, partnerInvite] = await Promise.all([
    prisma.projectInvite.findFirst({
      where: {
        email: verificationToken.identifier,
      },
      select: {
        email: true,
      },
    }),

    prisma.partnerInvite.findFirst({
      where: {
        email: verificationToken.identifier,
      },
      select: {
        email: true,
      },
    }),
  ]);

  const isInvite = Boolean(projectInvite || partnerInvite);
  const expiresIn = verificationToken.expires
    ? new Date(verificationToken.expires).getTime() - Date.now()
    : undefined;

  const { token: newToken } = await createVerificationToken({
    kind: isInvite ? "invite" : "magicLink",
    expiresIn,
    value: {
      email: verificationToken.identifier,
      ...(isInvite ? { isInvite } : {}),
    },
  });

  const verifyUrl = buildMagicLinkUrl({
    token: newToken,
    origin: requestUrl.origin,
    callbackURL: getSafeCallbackURL(callbackUrl, requestUrl.origin),
  });

  return NextResponse.redirect(verifyUrl);
}

function getSafeCallbackURL(callbackUrl: string, requestOrigin: string) {
  try {
    const resolved = new URL(callbackUrl, requestOrigin);

    if (
      resolved.origin === requestOrigin ||
      TRUSTED_CALLBACK_ORIGINS.has(resolved.origin)
    ) {
      return resolved.toString();
    }
  } catch {
    // fall through
  }

  return new URL("/", requestOrigin).toString();
}
