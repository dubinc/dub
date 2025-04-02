import { getSession, hashToken } from "@/lib/auth";
import { redis } from "@/lib/upstash";
import EmptyState from "@/ui/shared/empty-state";
import { sendEmail } from "@dub/email";
import { subscribe } from "@dub/email/resend/subscribe";
import { unsubscribe } from "@dub/email/resend/unsubscribe";
import { EmailUpdated } from "@dub/email/templates/email-updated";
import { prisma } from "@dub/prisma";
import { VerificationToken } from "@dub/prisma/client";
import { InputPassword, LoadingSpinner } from "@dub/ui";
import { waitUntil } from "@vercel/functions";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ConfirmEmailChangePageClient from "./page-client";

export const runtime = "nodejs";

interface PageProps {
  params: { token: string };
  searchParams: { cancel?: string };
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

  const currentUserId = session.user.id;

  const data = await redis.get<{
    email: string;
    newEmail: string;
  }>(`email-change-request:user:${currentUserId}`);

  if (!data) {
    return (
      <EmptyState
        icon={InputPassword}
        title="Invalid Token"
        description="This token is invalid. Please request a new one."
      />
    );
  }

  const user = await prisma.user.update({
    where: {
      id: currentUserId,
    },
    data: {
      email: data.newEmail,
    },
    select: {
      subscribed: true,
    },
  });

  waitUntil(
    Promise.all([
      deleteRequest(tokenFound),

      ...(user.subscribed
        ? [
            unsubscribe({ email: data.email }),
            subscribe({ email: data.newEmail }),
          ]
        : []),

      sendEmail({
        subject: "Your email address has been changed",
        email: data.email,
        react: EmailUpdated({
          oldEmail: data.email,
          newEmail: data.newEmail,
        }),
      }),
    ]),
  );

  return <ConfirmEmailChangePageClient />;
};

const deleteRequest = async (tokenFound: VerificationToken) => {
  await Promise.all([
    prisma.verificationToken.delete({
      where: {
        token: tokenFound.token,
      },
    }),

    redis.del(`email-change-request:user:${tokenFound.identifier}`),
  ]);
};
