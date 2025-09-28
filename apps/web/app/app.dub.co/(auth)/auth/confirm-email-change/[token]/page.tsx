import { getSession, hashToken } from "@/lib/auth";
import { redis } from "@/lib/upstash";
import EmptyState from "@/ui/shared/empty-state";
import { sendEmail } from "@dub/email";
import { subscribe } from "@dub/email/resend/subscribe";
import { unsubscribe } from "@dub/email/resend/unsubscribe";
import EmailUpdated from "@dub/email/templates/email-updated";
import { prisma } from "@dub/prisma";
import { User, VerificationToken } from "@dub/prisma/client";
import { InputPassword, LoadingSpinner } from "@dub/ui";
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
    (<div className="flex flex-col items-center justify-center gap-6 text-center">
      <Suspense
        fallback={
          <EmptyState
            icon={LoadingSpinner}
            title="Verifying Email Change"
            description="Verifying your email change request. This might take a few seconds..."
          />
        }
      >
        <VerifyEmailChange /* @next-codemod-error 'props' is used with spread syntax (...). Any asynchronous properties of 'props' must be awaited when accessed. */
        {...props} />
      </Suspense>
    </div>)
  );
}

const VerifyEmailChange = async ({
  params: { token },
  searchParams,
}: PageProps) => {
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
  const { cancel } = searchParams;

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

  const { id: userId, defaultPartnerId: partnerId } = session.user;

  const identifier = tokenFound.identifier.startsWith("pn_")
    ? partnerId
    : userId;

  const data = await redis.get<{
    email: string;
    newEmail: string;
    isPartnerProfile?: boolean;
  }>(`email-change-request:user:${identifier}`);

  if (!data) {
    return (
      <EmptyState
        icon={InputPassword}
        title="Invalid Token"
        description="This token is invalid. Please request a new one."
      />
    );
  }

  let user: Pick<User, "subscribed"> | null = null;

  // Update the partner profile email
  if (data.isPartnerProfile) {
    if (!partnerId) {
      return (
        <EmptyState
          icon={InputPassword}
          title="No Partner Profile Found"
          description="We couldn’t find a partner profile for your account. Please make sure you’re logged in with the correct account at https://partners.dub.co"
        />
      );
    }

    await prisma.partner.update({
      where: {
        id: partnerId,
      },
      data: {
        email: data.newEmail,
      },
    });
  }

  // Update the user email
  else {
    user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        email: data.newEmail,
      },
      select: {
        subscribed: true,
      },
    });
  }

  waitUntil(
    Promise.allSettled([
      deleteRequest(tokenFound),

      ...(user?.subscribed
        ? [
            unsubscribe({ email: data.email }),
            subscribe({ email: data.newEmail }),
          ]
        : []),

      sendEmail({
        subject: "Your email address has been changed",
        to: data.email,
        react: EmailUpdated({
          oldEmail: data.email,
          newEmail: data.newEmail,
          isPartnerProfile: !!data.isPartnerProfile,
        }),
      }),
    ]),
  );

  return (
    <ConfirmEmailChangePageClient isPartnerProfile={!!data.isPartnerProfile} />
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
