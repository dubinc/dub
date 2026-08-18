import { SSO_LOGIN_PROGRAMS } from "@/lib/auth/sso-login-programs";
import { getProgram } from "@/lib/fetchers/get-program";
import { AuthAlternativeBanner } from "@/ui/auth/auth-alternative-banner";
import LoginForm from "@/ui/auth/login/login-form";
import { AuthLayout } from "@/ui/layout/auth-layout";
import { cn, constructMetadata } from "@dub/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProgramSsoLogin } from "./program-sso-login";

export const metadata = constructMetadata({
  fullTitle: "Login to partners.dub.co",
});

export default async function LoginPage(props: {
  params: Promise<{ programSlug?: string }>;
}) {
  const { programSlug } = await props.params;

  const customSSOLoginProgram = programSlug
    ? SSO_LOGIN_PROGRAMS.find((program) => program.slug === programSlug)
    : undefined;

  if (customSSOLoginProgram) {
    return (
      <AuthLayout showTerms="partners">
        <ProgramSsoLogin
          name={customSSOLoginProgram.name}
          slug={customSSOLoginProgram.slug}
          logo={customSSOLoginProgram.logo}
          applyUrl={customSSOLoginProgram.applyUrl}
        />
      </AuthLayout>
    );
  }

  const program = programSlug ? await getProgram({ slug: programSlug }) : null;

  if (programSlug && !program) {
    redirect("/login");
  }

  const next = programSlug ? `/programs/${programSlug}` : "/";

  return (
    <div className="relative w-full">
      <AuthLayout showTerms="partners" className={cn(programSlug && "pt-20")}>
        <div className="w-full max-w-sm">
          <h1 className="text-center text-xl font-semibold">
            Log in to your Dub Partner account
          </h1>
          <div className="mt-8">
            <LoginForm methods={["email", "password", "google"]} next={next} />
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

          {!programSlug && (
            <div className="mt-12 w-full">
              <AuthAlternativeBanner
                text="Looking for your Dub workspace account?"
                cta="Log in at app.dub.co"
                href="https://app.dub.co/login"
              />
            </div>
          )}
        </div>
      </AuthLayout>
    </div>
  );
}
