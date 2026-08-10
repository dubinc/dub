import { assertCanConfirmEmailChange } from "@/lib/auth/assert-can-confirm-email-change";
import { requireServerSessionRedirect } from "@/lib/better-auth/get-session";
import { findVerificationToken } from "@/lib/better-auth/verification-token";
import { AuthLayout } from "@/ui/layout/auth-layout";
import EmptyState from "@/ui/shared/empty-state";
import { InputPassword, LoadingSpinner } from "@dub/ui";
import { Suspense } from "react";
import ConfirmEmailChangePageClient from "./page-client";

interface PageProps {
  params: Promise<{ token: string }>;
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

const VerifyEmailChange = async ({ params }: PageProps) => {
  const { token } = await params;

  const { user } = await requireServerSessionRedirect(
    `/login?next=/auth/confirm-email-change/${token}`,
  );

  const verification = await findVerificationToken({
    kind: "emailChange",
    identifier: token,
  });

  if (!verification || verification.isExpired || !verification.value.ownerId) {
    return (
      <EmptyState
        icon={InputPassword}
        title="Invalid Token"
        description="This token is invalid or expired. Please request a new one."
      />
    );
  }

  try {
    await assertCanConfirmEmailChange({
      userId: user.id,
      data: verification.value,
    });
  } catch {
    return (
      <EmptyState
        icon={InputPassword}
        title="Invalid Token"
        description="This token is invalid or expired. Please request a new one."
      />
    );
  }

  const { currentEmail, newEmail } = verification.value;

  return (
    <AuthLayout>
      <ConfirmEmailChangePageClient
        token={token}
        currentEmail={currentEmail}
        newEmail={newEmail}
      />
    </AuthLayout>
  );
};
