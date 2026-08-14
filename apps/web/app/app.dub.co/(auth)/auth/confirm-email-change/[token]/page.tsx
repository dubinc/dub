import {
  deleteEmailChangeRequest,
  type EmailChangeRequestData,
} from "@/lib/auth/confirm-email-change";
import { hashToken } from "@/lib/auth/hash-token";
import { requireServerSessionRedirect } from "@/lib/better-auth/get-session";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { AuthLayout } from "@/ui/layout/auth-layout";
import EmptyState from "@/ui/shared/empty-state";
import { InputPassword, LoadingSpinner } from "@dub/ui";
import { Suspense } from "react";
import ConfirmEmailChangePageClient from "./page-client";

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ cancel?: string }>;
}

export default async function ConfirmEmailChangePage(props: PageProps) {
  return (
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
  );
}

const VerifyEmailChange = async ({ params, searchParams }: PageProps) => {
  const { token } = await params;
  const { cancel } = await searchParams;

  if (cancel && cancel === "true") {
    await deleteEmailChangeRequest(token);

    return (
      <EmptyState
        icon={InputPassword}
        title="Email Change Request Canceled"
        description="Your email change request has been canceled. No changes have been made to your account. You can close this page."
      />
    );
  }

  await requireServerSessionRedirect(
    `/login?next=/auth/confirm-email-change/${token}`,
  );

  const tokenFound = await prisma.verificationToken.findUnique({
    where: {
      token: await hashToken(token, { secret: true }),
    },
    select: {
      token: true,
      expires: true,
    },
  });

  const isTokenValid = tokenFound && tokenFound.expires >= new Date();

  const data = isTokenValid
    ? await redis.get<EmailChangeRequestData>(
        `email-change-request:token:${tokenFound.token}`,
      )
    : null;

  return (
    <AuthLayout>
      <ConfirmEmailChangePageClient
        token={token}
        email={data?.email}
        newEmail={data?.newEmail}
      />
    </AuthLayout>
  );
};
