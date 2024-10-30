import { ForgotPasswordForm } from "@/ui/auth/forgot-password-form";
import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto my-10 w-full max-w-md md:mt-16 lg:mt-20">
      <div className="rounded-lg border border-neutral-200 bg-white p-8 pb-10">
        <h1 className="text-lg font-medium text-neutral-800">
          Reset your password
        </h1>
        <div className="mt-8">
          <ForgotPasswordForm />
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
