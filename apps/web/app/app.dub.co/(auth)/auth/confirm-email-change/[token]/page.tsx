import {
  assertCanConfirmEmailChange,
  deleteEmailChangeRequest,
  EmailChangeAuthError,
  EmailChangeRequestData,
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

  const tokenFound = await prisma.verificationToken.findUnique({
    where: {
      token: await hashToken(token, { secret: true }),
    },
    select: {
      token: true,
      expires: true,
      identifier: true,
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
    await deleteEmailChangeRequest(token);

    return (
      <EmptyState
        icon={InputPassword}
        title="Email Change Request Canceled"
        description="Your email change request has been canceled. No changes have been made to your account. You can close this page."
      />
    );
  }

  const { user } = await requireServerSessionRedirect(
    `/login?next=/auth/confirm-email-change/${token}`,
  );

  const data = await redis.get<EmailChangeRequestData>(
    `email-change-request:token:${tokenFound.token}`,
  );

  if (!data) {
    return (
      <EmptyState
        icon={InputPassword}
        title="Invalid Token"
        description="This token is invalid. Please request a new one."
      />
    );
  }

  try {
    await assertCanConfirmEmailChange({
      userId: user.id,
      tokenFound,
      data,
    });
  } catch (error) {
    if (error instanceof EmailChangeAuthError) {
      return (
        <EmptyState
          icon={InputPassword}
          title={
            error.reason === "unauthorized" ? "Unauthorized" : "Invalid Token"
          }
          description={error.message}
        />
      );
    }

    return (
      <EmptyState
        icon={InputPassword}
        title="Something Went Wrong"
        description="We couldn't verify your email change request. Please try again later."
      />
    );
  }

  return (
    <AuthLayout>
      <ConfirmEmailChangePageClient
        token={token}
        email={data.email}
        newEmail={data.newEmail}
      />
    </AuthLayout>
  );
};
