import { AuthLayout } from "@/ui/layout/auth-layout";
import { constructMetadata } from "@dub/utils";
import { TwoFactorChallengeForm } from "./form";

export const metadata = constructMetadata({
  title: `Two-factor challenge for ${process.env.NEXT_PUBLIC_APP_NAME}`,
});

export default function TwoFactorChallengePage() {
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
