"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Button from "#/ui/button";
import { Google } from "@/components/shared/icons";
import { InfoTooltip } from "#/ui/tooltip";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams?.get("next");
  const [showEmailOption, setShowEmailOption] = useState(false);
  const [showSSOOption, setShowSSOOption] = useState(false);
  const [noSuchAccount, setNoSuchAccount] = useState(false);
  const [email, setEmail] = useState("");
  const [clickedGoogle, setClickedGoogle] = useState(false);
  const [clickedEmail, setClickedEmail] = useState(false);
  const [clickedSSO, setClickedSSO] = useState(false);

  useEffect(() => {
    const error = searchParams?.get("error");
    error && toast.error(error);
  }, [searchParams]);

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
        disabled={clickedEmail || clickedSSO}
        icon={<Google className="h-4 w-4" />}
      />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setClickedEmail(true);
          fetch("/api/auth/account-exists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          })
            .then(async (res) => {
              const { exists } = await res.json();
              if (exists) {
                signIn("email", {
                  email,
                  redirect: false,
                  ...(next && next.length > 0 ? { callbackUrl: next } : {}),
                }).then((res) => {
                  setClickedEmail(false);
                  if (res?.ok && !res?.error) {
                    setEmail("");
                    toast.success("Email sent - check your inbox!");
                  } else {
                    toast.error("Error sending email - try again?");
                  }
                });
              } else {
                toast.error("No account found with that email address.");
                setNoSuchAccount(true);
                setClickedEmail(false);
              }
            })
            .catch(() => {
              setClickedEmail(false);
              toast.error("Error sending email - try again?");
            });
        }}
        className="flex flex-col space-y-3"
      >
        {showEmailOption && (
          <div>
            <div className="mb-4 mt-1 border-t border-gray-300" />
            <input
              id="email"
              name="email"
              autoFocus
              type="email"
              placeholder="panic@thedis.co"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setNoSuchAccount(false);
                setEmail(e.target.value);
              }}
              className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
            />
          </div>
        )}
        <Button
          text="Continue with Email"
          variant="secondary"
          {...(!showEmailOption && {
            type: "button",
            onClick: (e) => {
              e.preventDefault();
              setShowSSOOption(false);
              setShowEmailOption(true);
            },
          })}
          loading={clickedEmail}
          disabled={clickedGoogle || clickedSSO}
        />
      </form>
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
              setShowEmailOption(false);
              setShowSSOOption(true);
            },
          })}
          loading={clickedSSO}
          disabled={clickedGoogle || clickedEmail}
        />
      </form>
      {noSuchAccount ? (
        <p className="text-center text-sm text-red-500">
          No such account.{" "}
          <Link href="/register" className="font-semibold text-red-600">
            Sign up
          </Link>{" "}
          instead?
        </p>
      ) : (
        <p className="text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-gray-500 transition-colors hover:text-black"
          >
            Sign up
          </Link>
          .
        </p>
      )}
    </div>
  );
}
