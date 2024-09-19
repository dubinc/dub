"use client";

import Link from "next/link";
import { SignUpEmail } from "./signup-email";
import { SignUpOAuth } from "./signup-oauth";

export const RegisterForm = () => {
  return (
    <>
      <div className="w-full max-w-md overflow-hidden border-y border-gray-200 sm:rounded-2xl sm:border sm:shadow-sm">
        <div className="border-b border-gray-200 bg-white pb-6 pt-8 text-center">
          <h3 className="text-lg font-semibold">Get started with Dub</h3>
        </div>

        <div className="grid gap-3 bg-gray-50 px-4 py-8 sm:px-16">
          <SignUpEmail />
          <div className="relative flex items-center py-2">
            <div className="border-subtle flex-grow border-t" />
            <span className="text-subtle leadning-none mx-2 flex-shrink text-sm font-normal text-gray-700">
              Or continue with
            </span>
            <div className="border-subtle flex-grow border-t" />
          </div>
          <SignUpOAuth />
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-gray-500">
        Already have an account?&nbsp;
        <Link
          href="/login"
          className="font-semibold text-gray-500 underline underline-offset-2 transition-colors hover:text-black"
        >
          Sign in
        </Link>
      </p>
    </>
  );
};
