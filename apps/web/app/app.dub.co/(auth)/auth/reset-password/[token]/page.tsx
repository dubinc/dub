import { prisma } from "@/lib/prisma";
import { ResetPasswordForm } from "@/ui/auth/reset-password-form";
import EmptyState from "@/ui/shared/empty-state";
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
      <EmptyState
        icon={InputPassword}
        title="Invalid Reset Token"
        description="The password reset token is invalid or expired. Please request a new one."
      />
    );
  }

  return (
    <div className="relative z-10 my-10 flex min-h-full w-full items-center justify-center">
      <div className="mx-auto w-full max-w-md overflow-hidden border-y border-gray-200 sm:rounded-2xl sm:border sm:shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
          <h3 className="text-xl font-semibold">Reset your password</h3>
          <p className="text-sm text-gray-500">
            Enter new password for your account.
          </p>
        </div>
        <div className="flex flex-col gap-3 bg-gray-50 px-4 py-8 sm:px-16">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
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
