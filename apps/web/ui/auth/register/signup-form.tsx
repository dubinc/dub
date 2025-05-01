"use client";

import { SignUpEmail } from "./signup-email";
import { SignUpOAuth } from "./signup-oauth";

export const SignUpForm = ({
  methods = [
    "email",
    "google",
    // "github"
  ],
}: {
  methods?: ("email" | "google")[];
  // "github"
}) => {
  return (
    <div className="flex flex-col gap-3">
      <SignUpOAuth methods={methods} />
      {methods.length && (
        <div className="my-2 flex flex-shrink items-center justify-center gap-2">
          <div className="border-border-500 grow basis-0 border-b" />
          <span className="text-xs font-normal uppercase leading-none text-neutral-500">
            or
          </span>
          <div className="border-border-500 grow basis-0 border-b" />
        </div>
      )}
      {methods.includes("email") && <SignUpEmail />}
    </div>
  );
};
