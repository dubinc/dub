import { hashToken } from "@/lib/auth";
import { buildLookupKey, buildMagicLinkUrl } from "@/lib/better-auth/utils";
import { createVerificationToken } from "@/lib/better-auth/verification-token";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN, PARTNERS_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";

const TRUSTED_CALLBACK_ORIGINS = new Set([
  new URL(APP_DOMAIN).origin,
  new URL(PARTNERS_DOMAIN).origin,
]);

/**
 * Legacy NextAuth email callback → Better Auth invite bridge (invites only).
 *
 * What this handles:
 *   Already-sent workspace/partner invite emails that still point at:
 *     GET /api/auth/callback/email?email=...&token=...&callbackUrl=...
 *   Tokens live in the NextAuth `VerificationToken` table (hashed). Old invite
 *   links had no invite flag, so a pending ProjectInvite / PartnerInvite for
 *   the email is required. On success we consume that row and mint a Better
 *   Auth invite Verification, then redirect to /api/auth/magic-link/verify.
 *
 * What this intentionally skips:
 *   Legacy login magic links that used the same URL shape. Those expire with a
 *   short TTL, so we do not bridge them — request a new magic link instead.
 *   New invite + login flows already use /api/auth/magic-link/verify directly.
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

  const existingToken = await prisma.verificationToken.findUnique({
    where: {
      token: hashedToken,
    },
  });

  if (
    !existingToken ||
    existingToken.expires < new Date() ||
    existingToken.identifier.toLowerCase() !== email
  ) {
    return NextResponse.redirect(errorRedirect);
  }

  const [projectInvite, partnerInvite] = await Promise.all([
    prisma.projectInvite.findFirst({
      where: {
        email,
      },
      select: {
        projectId: true,
      },
    }),

    prisma.partnerInvite.findFirst({
      where: {
        email,
      },
      select: {
        partnerId: true,
      },
    }),
  ]);

  // Invite-only: do not bridge legacy login magic links (short TTL).
  if (!projectInvite && !partnerInvite) {
    return NextResponse.redirect(errorRedirect);
  }

  // Prefer partner invite when the request is on the partners host.
  const isPartnersHost = requestUrl.origin === new URL(PARTNERS_DOMAIN).origin;

  let lookupKey: string;
  if (partnerInvite && (isPartnersHost || !projectInvite)) {
    lookupKey = buildLookupKey("invite", email, partnerInvite.partnerId);
  } else if (projectInvite) {
    lookupKey = buildLookupKey("invite", email, projectInvite.projectId);
  } else {
    return NextResponse.redirect(errorRedirect);
  }

  // Consume so concurrent requests cannot both mint a Better Auth token.
  // deleteMany returns 0 when another request already took the row.
  const { count } = await prisma.verificationToken.deleteMany({
    where: {
      token: hashedToken,
    },
  });

  if (count === 0) {
    return NextResponse.redirect(errorRedirect);
  }

  const expiresIn = existingToken.expires
    ? new Date(existingToken.expires).getTime() - Date.now()
    : undefined;

  const { token: newToken } = await createVerificationToken({
    kind: "invite",
    expiresIn,
    value: {
      email,
      isInvite: true,
    },
    lookupKey,
    removePreviousTokens: true,
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
