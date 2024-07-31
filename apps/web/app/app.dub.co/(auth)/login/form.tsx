"use client";

import {
  AuthMethod,
  getLastUsedAuthMethod,
  LastUsedAuthMethodTooltip,
  setLastUsedAuthMethod,
} from "@/lib/auth/last-used-method";
import {
  Button,
  Github,
  Google,
  InfoTooltip,
  Input,
  useMediaQuery,
} from "@dub/ui";
import { Lock, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams?.get("next");
  const [showEmailOption, setShowEmailOption] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [showSSOOption, setShowSSOOption] = useState(false);
  const [noSuchAccount, setNoSuchAccount] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clickedGoogle, setClickedGoogle] = useState(false);
  const [clickedGithub, setClickedGithub] = useState(false);
  const [clickedEmail, setClickedEmail] = useState(false);
  const [clickedSSO, setClickedSSO] = useState(false);

  const [authMethod, setAuthMethod] = useState<AuthMethod | undefined>(
    undefined,
  );

  useEffect(() => {
    setAuthMethod(getLastUsedAuthMethod());
  }, []);

  useEffect(() => {
    const error = searchParams?.get("error");
    error && toast.error(error);
  }, [searchParams]);

  const { isMobile } = useMediaQuery();

  useEffect(() => {
    // when leave page, reset state
    return () => {
      setClickedGoogle(false);
      setClickedGithub(false);
      setClickedEmail(false);
      setClickedSSO(false);
    };
  }, []);

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Button
            text="Continue with Google"
            variant="secondary"
            onClick={() => {
              setClickedGoogle(true);
              setLastUsedAuthMethod("google");
              signIn("google", {
                ...(next && next.length > 0 ? { callbackUrl: next } : {}),
              });
            }}
            loading={clickedGoogle}
            disabled={clickedEmail || clickedSSO}
            icon={<Google className="h-5 w-5" />}
          />
          {authMethod === "google" && <LastUsedAuthMethodTooltip />}
        </div>

        <div className="relative">
          <Button
            text="Continue with Github"
            variant="secondary"
            onClick={() => {
              setClickedGithub(true);
              setLastUsedAuthMethod("github");
              signIn("github", {
                ...(next && next.length > 0 ? { callbackUrl: next } : {}),
              });
            }}
            loading={clickedGithub}
            disabled={clickedEmail || clickedSSO}
            icon={<Github className="h-5 w-5 text-black" />}
          />
          {authMethod === "github" && <LastUsedAuthMethodTooltip />}
        </div>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setClickedEmail(true);
          setLastUsedAuthMethod("email");
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
              autoFocus={!isMobile}
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

        {showPasswordField && (
          <div>
            <Input type="password" placeholder="Password" value={password} />
          </div>
        )}

        <div className="relative">
          <Button
            text="Continue with Email"
            variant="secondary"
            icon={<Mail className="h-4 w-4" />}
            {...(!showEmailOption && {
              type: "button",
              onClick: (e) => {
                e.preventDefault();
                setLastUsedAuthMethod("email");
                setShowSSOOption(false);
                setShowEmailOption(true);
              },
            })}
            loading={clickedEmail}
            disabled={clickedGoogle || clickedSSO}
          />
          {authMethod === "email" && <LastUsedAuthMethodTooltip />}
        </div>
      </form>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setClickedSSO(true);
          setLastUsedAuthMethod("saml");
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
              tenant: data.workspaceId,
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
                Workspace Slug
              </h2>
              <InfoTooltip
                content={`This is your workspace's unique identifier on ${process.env.NEXT_PUBLIC_APP_NAME}. E.g. app.dub.co/acme is "acme".`}
              />
            </div>
            <input
              id="slug"
              name="slug"
              autoFocus={!isMobile}
              type="text"
              placeholder="my-team"
              autoComplete="off"
              required
              className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
            />
          </div>
        )}

        <div className="relative">
          <Button
            text="Continue with SAML SSO"
            variant="secondary"
            icon={<Lock className="h-4 w-4" />}
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
          {authMethod === "saml" && <LastUsedAuthMethodTooltip />}
        </div>
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
        </p>
      )}
    </>
  );
}
