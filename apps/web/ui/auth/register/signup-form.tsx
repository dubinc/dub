"use client";

import { AnimatedSizeContainer } from "@dub/ui";
import { AuthMethodsSeparator } from "../auth-methods-separator";
import { SignUpEmail } from "./signup-email";
import { SignUpOAuth } from "./signup-oauth";

export const SignUpForm = ({
  methods = ["email", "google", "github"],
}: {
  methods?: ("email" | "google" | "github")[];
}) => {
  return (
    <AnimatedSizeContainer height>
      <div className="flex flex-col gap-3 p-1">
        {methods.includes("email") && <SignUpEmail />}
        {methods.length && <AuthMethodsSeparator />}
        <SignUpOAuth methods={methods} />
      </div>
    </AnimatedSizeContainer>
  );
};
