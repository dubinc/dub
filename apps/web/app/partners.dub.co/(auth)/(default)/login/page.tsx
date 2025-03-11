import { getProgram } from "@/lib/fetchers/get-program";
import LoginForm from "@/ui/auth/login/login-form";
import { ClientOnly } from "@dub/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PartnerBanner } from "../partner-banner";

export default async function LoginPage({
  params,
}: {
  params: { programSlug?: string };
}) {
  const { programSlug } = params;
  const program = programSlug ? await getProgram({ slug: programSlug }) : null;

  if (programSlug && !program) notFound();

  return (
    <div className="mx-auto my-10 w-full max-w-[480px] md:mt-16 lg:mt-20">
      {program && <PartnerBanner program={program} />}
      <div className="rounded-lg border border-neutral-200 bg-white p-8 pb-10">
        <h1 className="text-lg font-medium text-neutral-800">
          Sign in to your Dub Partner account
        </h1>
        <div className="mt-8">
          <ClientOnly>
            <LoginForm
              methods={["email", "password", "google"]}
              next={`/${programSlug ? `/programs/${programSlug}` : ""}`}
            />
          </ClientOnly>
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-neutral-500">
        Don't have an account?&nbsp;
        <Link
          href="register"
          className="font-semibold text-neutral-500 underline underline-offset-2 transition-colors hover:text-black"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
