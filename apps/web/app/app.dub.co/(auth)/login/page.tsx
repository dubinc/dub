import { AuthAlternativeBanner } from "@/ui/auth/auth-alternative-banner";
import LoginForm from "@/ui/auth/login/login-form";
import { AuthLayout } from "@/ui/layout/auth-layout";
import { APP_DOMAIN, constructMetadata } from "@dub/utils";
import Link from "next/link";

export const metadata = constructMetadata({
  title: `Sign in to ${process.env.NEXT_PUBLIC_APP_NAME}`,
  canonicalUrl: `${APP_DOMAIN}/login`,
});

export default function LoginPage() {
  return (
    <AuthLayout showTerms>
      <div className="w-full max-w-sm">
        <h3 className="text-center text-xl font-semibold">
          Log in to your Dub account
        </h3>
        <div className="mt-8">
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-sm font-medium text-neutral-500">
          Don't have an account?&nbsp;
          <Link
            href="register"
            className="font-semibold text-neutral-700 transition-colors hover:text-neutral-900"
          >
            Sign up
          </Link>
        </p>

        <div className="mt-12 w-full">
          <AuthAlternativeBanner
            text="Looking for your Dub partner account?"
            cta="Log in at partners.dub.co"
            href="https://partners.dub.co/login"
          />
        </div>
      </div>
    </AuthLayout>
  );
}
