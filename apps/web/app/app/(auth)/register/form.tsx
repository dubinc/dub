"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Google } from "@/components/shared/icons";
import Button from "#/ui/button";
import Link from "next/link";
import { InfoTooltip } from "#/ui/tooltip";
import { toast } from "sonner";

export default function RegisterForm() {
  const searchParams = useSearchParams();
  const next = searchParams?.get("next");
  const [clickedGoogle, setClickedGoogle] = useState(false);
  const [showSSOOption, setShowSSOOption] = useState(false);
  const [clickedSSO, setClickedSSO] = useState(false);

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
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setClickedSSO(true);
          fetch("/api/auth/saml/verify", {
            method: "POST",
            body: JSON.stringify({ slug: e.currentTarget.slug.value }),
          }).then(async (res) => {
            const { data, error } = await res.json();
            if (error) {
              toast.error(error);
              setClickedSSO(false);
              return;
            }
            await signIn("saml", undefined, {
              tenant: data.projectId,
              product: "Dub",
            });
          });
        }}
        className="flex flex-col space-y-3"
      >
        {showSSOOption && (
          <div>
            <div className="mb-4 mt-1 border-t border-gray-300" />
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-medium text-gray-900">
                Project Slug
              </h2>
              <InfoTooltip
                content={`This is your project's unique identifier on Dub. E.g. app.dub.co/acme is "acme".`}
              />
            </div>
            <input
              id="slug"
              name="slug"
              autoFocus
              type="text"
              placeholder="my-team"
              autoComplete="off"
              required
              className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
            />
          </div>
        )}
        <Button
          text="Continue with SAML SSO"
          variant="secondary"
          {...(!showSSOOption && {
            type: "button",
            onClick: (e) => {
              e.preventDefault();
              setShowSSOOption(true);
            },
          })}
          loading={clickedSSO}
          disabled={clickedGoogle || clickedGoogle}
        />
      </form>
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
