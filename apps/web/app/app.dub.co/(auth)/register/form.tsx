"use client";

import { SignUpEmail } from "./signup-email";
import { SignUpOAuth } from "./signup-oauth";

export default function RegisterForm() {
  return (
    <>
      <SignUpEmail />
      <div className="relative flex items-center py-2">
        <div className="border-subtle flex-grow border-t" />
        <span className="text-subtle leadning-none mx-2 flex-shrink text-sm font-normal text-gray-700">
          Or continue with
        </span>
        <div className="border-subtle flex-grow border-t" />
      </div>
      <SignUpOAuth />
    </>
  );
}
