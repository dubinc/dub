"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Google } from "@/components/shared/icons";
import Button from "#/ui/button";
import { SSOWaitlist } from "#/ui/tooltip";
import Link from "next/link";

export default function RegisterForm() {
  const searchParams = useSearchParams();
  const next = searchParams?.get("next");
  const [clickedGoogle, setClickedGoogle] = useState(false);
  return (
    <div className="flex flex-col space-y-3 bg-gray-50 px-4 py-8 sm:px-16">
      <Button
        text="Continue with Google"
        onClick={() => {
          setClickedGoogle(true);
          signIn("google", {
            ...(next && next.length > 0 ? { callbackUrl: next } : {}),
          });
        }}
        loading={clickedGoogle}
        icon={<Google className="h-4 w-4" />}
      />
      <Button
        text="Continue with SAML SSO"
        disabled
        disabledTooltip={<SSOWaitlist />}
      />
      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-gray-500 transition-colors hover:text-black"
        >
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}
