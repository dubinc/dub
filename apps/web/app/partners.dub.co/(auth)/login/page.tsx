import LoginForm from "@/ui/auth/login/login-form";
import { ClientOnly } from "@dub/ui";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="mx-auto my-10 w-full max-w-md md:mt-16 lg:mt-20">
      <div className="rounded-lg border border-neutral-200 bg-white p-8 pb-10">
        <h1 className="text-lg font-medium text-neutral-800">
          Sign in to your Dub Partner account
        </h1>
        <div className="mt-8">
          <ClientOnly>
            <LoginForm methods={["email", "password", "google"]} />
          </ClientOnly>
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-gray-500">
        Don't have an account?&nbsp;
        <Link
          href="register"
          className="font-semibold text-gray-500 underline underline-offset-2 transition-colors hover:text-black"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
