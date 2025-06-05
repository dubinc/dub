import { ResetPasswordForm } from "@/ui/auth/reset-password-form";
import { AuthLayout } from "@/ui/layout/auth-layout";
import EmptyState from "@/ui/shared/empty-state";
import { prisma } from "@dub/prisma";
import { InputPassword } from "@dub/ui";

export const runtime = "nodejs";

interface Props {
  params: {
    token: string;
  };
}

export default async function ResetPasswordPage({ params: { token } }: Props) {
  const validToken = await isValidToken(token);

  if (!validToken) {
    return (
      <AuthLayout>
        <EmptyState
          icon={InputPassword}
          title="Invalid Reset Token"
          description="The password reset token is invalid or expired. Please request a new one."
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm">
        <h3 className="text-center text-xl font-semibold">
          Reset your password
        </h3>
        <div className="mt-8">
          <ResetPasswordForm />
        </div>
      </div>
    </AuthLayout>
  );
}

const isValidToken = async (token: string) => {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: {
      token,
      expires: {
        gte: new Date(),
      },
    },
    select: {
      token: true,
    },
  });

  return !!resetToken;
};
