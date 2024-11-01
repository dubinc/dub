import LoginForm from "@/ui/auth/login/login-form";
import { AuthLayout } from "@/ui/layout/auth-layout";
import { constructMetadata } from "@dub/utils";
import Link from "next/link";

export const metadata = constructMetadata({
  title: `Sign in to ${process.env.NEXT_PUBLIC_APP_NAME}`,
});

export default function LoginPage() {
  return (
    <AuthLayout>
      <div className="w-full max-w-md overflow-hidden border-y border-gray-200 sm:rounded-2xl sm:border sm:shadow-sm">
        <div className="border-b border-gray-200 bg-white pb-6 pt-8 text-center">
          <h3 className="text-lg font-semibold">Sign in to your Dub account</h3>
        </div>
        <div className="bg-gray-50 px-4 py-8 sm:px-16">
          <LoginForm />
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
    </AuthLayout>
  );
}
