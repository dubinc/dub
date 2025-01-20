import { ResetPasswordForm } from "@/ui/auth/reset-password-form";
import EmptyState from "@/ui/shared/empty-state";
import { prisma } from "@dub/prisma";
import { InputPassword } from "@dub/ui";
import { getTranslations } from "next-intl/server";

export const runtime = "nodejs";

interface Props {
  params: {
    token: string;
  };
}

export default async function ResetPasswordPage({ params: { token } }: Props) {
  const t = await getTranslations(
    "app.dub.co/(auth)/auth/reset-password/[token]",
  );

  const validToken = await isValidToken(token);

  if (!validToken) {
    return (
      <EmptyState
        icon={InputPassword}
        title={t("invalid-reset-token")}
        description={t("invalid-or-expired-token-message")}
      />
    );
  }

  return (
    <div className="relative z-10 my-10 flex min-h-full w-full items-center justify-center">
      <div className="mx-auto w-full max-w-md overflow-hidden border-y border-gray-200 sm:rounded-2xl sm:border sm:shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
          <h3 className="text-xl font-semibold">{t("reset-your-password")}</h3>
          <p className="text-sm text-gray-500">{t("enter-new-password")}</p>
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
