"use client";

import Link from "next/link";
import { SignUpEmail } from "./signup-email";
import { SignUpOAuth } from "./signup-oauth";

export const SignUpForm = () => {
  return (
    <>
      <div className="w-full max-w-md overflow-hidden border-y border-gray-200 sm:rounded-2xl sm:border sm:shadow-sm">
        <div className="border-b border-gray-200 bg-white pb-6 pt-8 text-center">
          <h3 className="text-lg font-semibold">Get started with Dub</h3>
        </div>

        <div className="grid gap-3 bg-gray-50 px-4 py-8 sm:px-16">
          <SignUpEmail />
          <div className="my-2 flex flex-shrink items-center justify-center gap-2">
            <div className="grow basis-0 border-b border-gray-300" />
            <span className="text-xs font-normal uppercase leading-none text-gray-500">
              or
            </span>
            <div className="grow basis-0 border-b border-gray-300" />
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
