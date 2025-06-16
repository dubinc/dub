import { getProgram } from "@/lib/fetchers/get-program";
import { AuthAlternativeBanner } from "@/ui/auth/auth-alternative-banner";
import LoginForm from "@/ui/auth/login/login-form";
import { AuthLayout } from "@/ui/layout/auth-layout";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PartnerBanner } from "../partner-banner";

export default async function LoginPage({
  params: { programSlug },
}: {
  params: { programSlug?: string };
}) {
  const program = programSlug ? await getProgram({ slug: programSlug }) : null;

  if (programSlug && !program) {
    notFound();
  }

  return (
    <AuthLayout showTerms>
      <div className="w-full max-w-sm">
        {program && <PartnerBanner program={program} />}
        <h1 className="text-center text-xl font-semibold">
          Log in to your Dub Partner account
        </h1>
        <div className="mt-8">
          <LoginForm
            methods={["email", "password", "google"]}
            next={`/${programSlug ? `/programs/${programSlug}` : ""}`}
          />
        </div>
        <p className="mt-6 text-center text-sm font-medium text-neutral-500">
          Don't have a partner account?&nbsp;
          <Link
            href={`${programSlug ? `/${programSlug}` : ""}/register`}
            className="font-semibold text-neutral-700 transition-colors hover:text-neutral-900"
          >
            Sign up
          </Link>
        </p>

        <div className="mt-12 w-full">
          <AuthAlternativeBanner
            text="Looking for your Dub workspace account?"
            cta="Log in at app.dub.co"
            href="https://app.dub.co/login"
          />
        </div>
      </div>
    </AuthLayout>
  );
}
