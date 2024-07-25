"use client";

import { Button, Github, Google } from "@dub/ui";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function RegisterForm() {
  const searchParams = useSearchParams();
  const next = searchParams?.get("next");
  const [clickedGoogle, setClickedGoogle] = useState(false);
  const [clickedGithub, setClickedGithub] = useState(false);

  useEffect(() => {
    // when leave page, reset state
    return () => {
      setClickedGoogle(false);
      setClickedGithub(false);
    };
  }, []);

  return (
    <>
      <Button
        variant="secondary"
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
        variant="secondary"
        text="Continue with GitHub"
        onClick={() => {
          setClickedGithub(true);
          signIn("github", {
            ...(next && next.length > 0 ? { callbackUrl: next } : {}),
          });
        }}
        loading={clickedGithub}
        icon={<Github className="h-4 w-4" />}
      />
      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-gray-500 transition-colors hover:text-black"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
