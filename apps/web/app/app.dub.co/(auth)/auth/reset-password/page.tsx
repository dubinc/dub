import { ResetPasswordForm } from "@/ui/auth/reset-password-form";
import { AuthLayout } from "@/ui/layout/auth-layout";
import EmptyState from "@/ui/shared/empty-state";
import { InputPassword } from "@dub/ui";

interface Props {
  searchParams: Promise<{
    token?: string;
    error?: string;
  }>;
}

export default async function ResetPasswordPage(props: Props) {
  const searchParams = await props.searchParams;
  const { token, error } = searchParams;

  if (error || !token) {
    return (
      <EmptyState
        icon={InputPassword}
        title="Invalid Reset Token"
        description="The password reset token is invalid or expired. Please request a new one."
      />
    );
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm">
        <h3 className="text-center text-xl font-semibold">
          Reset your password
        </h3>
        <div className="mt-8">
          <ResetPasswordForm token={token} />
        </div>
      </div>
    </AuthLayout>
  );
}
