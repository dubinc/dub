import { requireServerSessionRedirect } from "@/lib/better-auth/get-session";
import {
  deleteVerificationTokens,
  findVerificationToken,
} from "@/lib/better-auth/verification-token";
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

  // Cancel the email change request (?cancel=true)
  const { cancel } = await searchParams;

  if (cancel && cancel === "true") {
    await deleteVerificationTokens({
      kind: "emailChange",
      identifier: token,
    });

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

  const verification = await findVerificationToken({
    kind: "emailChange",
    identifier: token,
  });

  if (!verification || !verification.isValid) {
    return (
      <EmptyState
        icon={InputPassword}
        title="Invalid Token"
        description="This token is invalid or expired. Please request a new one."
      />
    );
  }

  return (
    <AuthLayout>
      <ConfirmEmailChangePageClient verification={verification} />
    </AuthLayout>
  );
};
