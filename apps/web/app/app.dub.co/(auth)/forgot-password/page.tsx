import { ForgotPasswordForm } from "@/ui/auth/forgot-password-form";
import { AuthLayout } from "@/ui/layout/auth-layout";
import { constructMetadata } from "@dub/utils";
import Link from "next/link";

export const metadata = constructMetadata({
  title: `Forgot Password for ${process.env.NEXT_PUBLIC_APP_NAME}`,
});

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <div className="border-border-500 w-full max-w-md overflow-hidden border-y sm:rounded-2xl sm:border sm:shadow-sm">
        <div className="border-border-500 flex flex-col items-center justify-center space-y-3 border-b bg-white px-4 py-6 pt-8 text-center sm:px-16">
          <h3 className="text-xl font-semibold">Reset your password</h3>
        </div>

        <div className="bg-neutral-50 px-4 py-8 sm:px-16">
          <ForgotPasswordForm />
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-neutral-500">
        Already have an account?&nbsp;
        <Link
          href="/?login=true"
          className="hover:text-neutral font-semibold text-neutral-500 underline underline-offset-2 transition-colors"
        >
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
