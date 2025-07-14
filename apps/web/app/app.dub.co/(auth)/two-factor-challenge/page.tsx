import { TWO_FA_COOKIE_NAME } from "@/lib/auth/constants";
import { AuthLayout } from "@/ui/layout/auth-layout";
import { constructMetadata } from "@dub/utils";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TwoFactorChallengeForm } from "./form";

export const metadata = constructMetadata({
  title: `Two-factor challenge for ${process.env.NEXT_PUBLIC_APP_NAME}`,
});

export default function TwoFactorChallengePage() {
  const cookie = cookies().get(TWO_FA_COOKIE_NAME);

  if (!cookie) {
    redirect("/login");
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm">
        <h3 className="text-center text-xl font-semibold">
          Two-factor authentication
        </h3>

        <div className="mt-8">
          <TwoFactorChallengeForm />
        </div>
      </div>
    </AuthLayout>
  );
}
