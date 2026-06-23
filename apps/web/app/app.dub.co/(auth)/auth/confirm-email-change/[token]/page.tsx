import { getSession, hashToken } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/partner-users/partner-user-permissions";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import EmptyState from "@/ui/shared/empty-state";
import { sendEmail } from "@dub/email";
import EmailUpdated from "@dub/email/templates/email-updated";
import { InputPassword, LoadingSpinner } from "@dub/ui";
import { VerificationToken } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ConfirmEmailChangePageClient from "./page-client";

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ cancel?: string }>;
}

export default async function ConfirmEmailChangePage(props: PageProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 text-center">
      <Suspense
        fallback={
          <EmptyState
            icon={LoadingSpinner}
            title="Verifying Email Change"
            description="Verifying your email change request. This might take a few seconds..."
          />
        }
      >
        <VerifyEmailChange {...props} />
      </Suspense>
    </div>
  );
}

const VerifyEmailChange = async ({ params, searchParams }: PageProps) => {
  const { token } = await params;

  const tokenFound = await prisma.verificationToken.findUnique({
    where: {
      token: await hashToken(token, { secret: true }),
    },
  });

  if (!tokenFound || tokenFound.expires < new Date()) {
    return (
      <EmptyState
        icon={InputPassword}
        title="Invalid Token"
        description="This token is invalid or expired. Please request a new one."
      />
    );
  }

  // Cancel the email change request (?cancel=true)
  const { cancel } = await searchParams;

  if (cancel && cancel === "true") {
    await deleteRequest(tokenFound);

    return (
      <EmptyState
        icon={InputPassword}
        title="Email Change Request Canceled"
        description="Your email change request has been canceled. No changes have been made to your account. You can close this page."
      />
    );
  }

  // Process the email change request
  const session = await getSession();

  if (!session) {
    redirect(`/login?next=/auth/confirm-email-change/${token}`);
  }

  const { id: userId } = session.user;
  const tokenIdentifier = tokenFound.identifier;

  if (tokenIdentifier.startsWith("pn_")) {
    const partnerUser = await prisma.partnerUser.findUnique({
      where: {
        userId_partnerId: {
          userId,
          partnerId: tokenIdentifier,
        },
      },
      select: { role: true },
    });

    if (
      !partnerUser ||
      !hasPermission(partnerUser.role, "partner_profile.update")
    ) {
      return (
        <EmptyState
          icon={InputPassword}
          title="Invalid Token"
          description="This token is invalid. Please request a new one."
        />
      );
    }
  } else if (tokenIdentifier !== userId) {
    return (
      <EmptyState
        icon={InputPassword}
        title="Invalid Token"
        description="This token is invalid. Please request a new one."
      />
    );
  }

  const data = await redis.get<{
    email: string;
    newEmail: string;
    isPartnerProfile?: boolean;
    syncIdentity?: boolean;
    partnerId?: string;
    redirectTo?: "/profile" | "/account/settings";
  }>(`email-change-request:user:${tokenIdentifier}`);

  if (!data) {
    return (
      <EmptyState
        icon={InputPassword}
        title="Invalid Token"
        description="This token is invalid. Please request a new one."
      />
    );
  }

  if (data.syncIdentity) {
    const syncedPartnerId = data.partnerId;

    if (!syncedPartnerId) {
      return (
        <EmptyState
          icon={InputPassword}
          title="Invalid Token"
          description="This token is invalid. Please request a new one."
        />
      );
    }

    const partnerUser = await prisma.partnerUser.findUnique({
      where: {
        userId_partnerId: {
          userId,
          partnerId: syncedPartnerId,
        },
      },
      select: { role: true },
    });

    if (
      !partnerUser ||
      !hasPermission(partnerUser.role, "partner_profile.update")
    ) {
      return (
        <EmptyState
          icon={InputPassword}
          title="Unauthorized"
          description="You don't have access to update the partner profile associated with this email change request."
        />
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          email: data.newEmail,
        },
      }),
      prisma.partner.update({
        where: {
          id: syncedPartnerId,
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
        id: userId,
      },
      data: {
        email: data.newEmail,
      },
    });
  }

  waitUntil(
    Promise.allSettled([
      deleteRequest(tokenFound),

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
    ]),
  );

  return (
    <ConfirmEmailChangePageClient
      isPartnerProfile={!!data.isPartnerProfile}
      redirectTo={data.redirectTo}
    />
  );
};

const deleteRequest = async (tokenFound: VerificationToken) => {
  await Promise.allSettled([
    prisma.verificationToken.delete({
      where: {
        token: tokenFound.token,
      },
    }),

    redis.del(`email-change-request:user:${tokenFound.identifier}`),
  ]);
};
