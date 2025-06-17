import { getProgram } from "@/lib/fetchers/get-program";
import { AuthAlternativeBanner } from "@/ui/auth/auth-alternative-banner";
import { FramerButton } from "@/ui/auth/login/framer-button";
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
  if (programSlug === "framer") {
    return (
      <AuthLayout showTerms>
        <div className="mx-auto my-10 flex w-full max-w-sm flex-col gap-8">
          <div className="animate-slide-up-fade relative flex w-auto flex-col items-center [--offset:10px] [animation-duration:1.3s] [animation-fill-mode:both]">
            <img
              src="https://assets.dub.co/testimonials/companies/framer.svg"
              alt="Framer Logo"
              className="h-8"
            />
          </div>
          <div className="animate-slide-up-fade flex flex-col items-center justify-center gap-2 [--offset:10px] [animation-delay:0.15s] [animation-duration:1.3s] [animation-fill-mode:both]">
            <h1 className="text-lg font-medium text-neutral-800">
              Sign in to Framer Partners
            </h1>
            <p className="text-center text-sm text-neutral-700">
              Not a Framer Partner?&nbsp;
              <Link
                href="https://www.framer.com/creators"
                target="_blank"
                className="font-normal underline underline-offset-2 transition-colors hover:text-black"
              >
                Apply today
              </Link>
            </p>
          </div>

          <div className="animate-slide-up-fade [--offset:10px] [animation-delay:0.3s] [animation-duration:1.3s] [animation-fill-mode:both]">
            <FramerButton />
          </div>
        </div>
      </AuthLayout>
    );
  }

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
            next={programSlug ? `/programs/${programSlug}` : "/"}
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
