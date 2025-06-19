"use client";

import { AuthAlternativeBanner } from "@/ui/auth/auth-alternative-banner";
import {
  RegisterProvider,
  useRegisterContext,
} from "@/ui/auth/register/context";
import { SignUpForm } from "@/ui/auth/register/signup-form";
import { VerifyEmailForm } from "@/ui/auth/register/verify-email-form";
import { AuthLayout } from "@/ui/layout/auth-layout";
import { truncate } from "@dub/utils";
import { Program } from "@prisma/client";
import Link from "next/link";
import { PartnerBanner } from "../partner-banner";

type PartialProgram = Pick<Program, "name" | "logo" | "slug">;

export default function RegisterPageClient({
  program,
  email,
  lockEmail,
}: {
  program?: PartialProgram;
  email?: string;
  lockEmail?: boolean;
}) {
  return (
    <RegisterProvider email={email} lockEmail={lockEmail}>
      <RegisterFlow program={program} />
    </RegisterProvider>
  );
}

function SignUp({ program }: { program?: PartialProgram }) {
  return (
    <AuthLayout showTerms>
      <div className="w-full max-w-sm">
        {program && <PartnerBanner program={program} />}
        <h1 className="text-center text-xl font-semibold">
          Create your Dub Partner account
        </h1>
        <div className="mt-8">
          <SignUpForm methods={["email", "google"]} />
        </div>
        <p className="mt-6 text-center text-sm font-medium text-neutral-500">
          Already have an account?&nbsp;
          <Link
            href={`${program ? `/${program.slug}` : ""}/login`}
            className="font-semibold text-neutral-700 transition-colors hover:text-neutral-900"
          >
            Sign in
          </Link>
        </p>

        <div className="mt-12 w-full">
          <AuthAlternativeBanner
            text="Looking for your Dub workspace account?"
            cta="Sign up at app.dub.co"
            href="https://app.dub.co/register"
          />
        </div>
      </div>
    </AuthLayout>
  );
}

function Verify() {
  const { email } = useRegisterContext();

  return (
    <AuthLayout>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-1 text-center">
          <h3 className="text-center text-xl font-semibold">
            Verify your email address
          </h3>
          <p className="text-base font-medium text-neutral-500">
            Enter the six digit verification code sent to{" "}
            <strong className="font-semibold text-neutral-600" title={email}>
              {truncate(email, 30)}
            </strong>
          </p>
        </div>
        <div className="mt-12">
          <VerifyEmailForm />
        </div>
      </div>
    </AuthLayout>
  );
}

const RegisterFlow = ({ program }: { program?: PartialProgram }) => {
  const { step } = useRegisterContext();

  if (step === "signup") return <SignUp program={program} />;
  if (step === "verify") return <Verify />;
};
