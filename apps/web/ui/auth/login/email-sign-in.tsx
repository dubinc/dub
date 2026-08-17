"use client";

import { checkAccountExistsAction } from "@/lib/actions/check-account-exists";
import { authClient } from "@/lib/better-auth/auth-client";
import { AUTH_ERROR_MESSAGES } from "@/lib/better-auth/auth-errors";
import { parseEmail } from "@/lib/zod/schemas/auth";
import { Button, Input, useCurrentSubdomain, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { getPostLoginRedirect } from "./get-post-login-redirect";
import { LoginFormContext } from "./login-form";

function authErrorMessage(message?: string | null) {
  if (!message) {
    return null;
  }

  return AUTH_ERROR_MESSAGES[message] ?? message;
}

export const EmailSignIn = ({ next }: { next?: string }) => {
  const { subdomain } = useCurrentSubdomain();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isMobile } = useMediaQuery();
  const prefilledEmail = parseEmail(searchParams?.get("email"));
  const [email, setEmail] = useState(prefilledEmail ?? "");
  const [password, setPassword] = useState("");

  const finalNext = getPostLoginRedirect({
    next,
    searchParamsNext: searchParams?.get("next"),
  });

  const {
    showPasswordField,
    setShowPasswordField,
    setClickedMethod,
    authMethod,
    setAuthMethod,
    clickedMethod,
    setShowSSOOption,
  } = useContext(LoginFormContext);

  const { executeAsync, isPending } = useAction(checkAccountExistsAction, {
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  useEffect(() => {
    if (!prefilledEmail) {
      return;
    }

    void executeAsync({ email: prefilledEmail }).then((result) => {
      if (result?.data?.accountExists && result.data.hasPassword) {
        setShowPasswordField(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <form
        onSubmit={async (e) => {
          e.preventDefault();

          // Check if the user can enter a password, and if so display the field
          if (!showPasswordField) {
            const result = await executeAsync({ email });

            if (!result?.data) {
              return;
            }

            const { accountExists, hasPassword, requireSAML } = result.data;

            if (requireSAML) {
              setClickedMethod(undefined);
              toast.error(AUTH_ERROR_MESSAGES["require-saml-sso"]);
              return;
            }

            if (accountExists && hasPassword) {
              setShowPasswordField(true);
              return;
            }

            if (!accountExists) {
              setClickedMethod(undefined);
              toast.error("No account found with that email address.");
              return;
            }
          }

          setClickedMethod("email");

          const result = await executeAsync({ email });

          if (!result?.data) {
            setClickedMethod(undefined);
            return;
          }

          const { accountExists, hasPassword } = result.data;

          if (!accountExists) {
            setClickedMethod(undefined);
            toast.error("No account found with that email address.");
            return;
          }

          if (password && hasPassword) {
            const { error } = await authClient.signIn.email({
              email,
              password,
            });

            if (error) {
              toast.error(
                authErrorMessage(error.message) ??
                  AUTH_ERROR_MESSAGES["invalid-credentials"],
              );
              setClickedMethod(undefined);
              return;
            }

            router.push(finalNext);
            return;
          }

          const { error } = await authClient.signIn.magicLink({
            email,
            callbackURL: finalNext,
          });

          if (error) {
            toast.error(
              authErrorMessage(error.message) ?? "Failed to send login email.",
            );
            setClickedMethod(undefined);
            return;
          }

          toast.success("Email sent - check your inbox!");
          setEmail("");
          setClickedMethod(undefined);
        }}
        className="flex flex-col gap-y-6"
      >
        {authMethod === "email" && (
          <label>
            <span className="text-content-emphasis mb-2 block text-sm font-medium leading-none">
              {subdomain === "partners" ? "Email" : "Work email"}
            </span>
            <input
              id="email"
              name="email"
              autoFocus={!isMobile && !showPasswordField}
              type="email"
              placeholder="panic@thedis.co"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              size={1}
              className={cn(
                "block w-full min-w-0 appearance-none rounded-md border border-neutral-300 px-3 py-2 placeholder-neutral-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm",
                {
                  "pr-10": isPending,
                },
              )}
            />
          </label>
        )}

        {showPasswordField && (
          <label>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-content-emphasis block text-sm font-medium leading-none">
                Password
              </span>
              <Link
                href={`/forgot-password?email=${encodeURIComponent(email)}`}
                className="text-content-subtle hover:text-content-emphasis text-xs leading-none underline underline-offset-2 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              type="password"
              autoFocus={!isMobile}
              value={password}
              placeholder="Password (optional)"
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}

        <Button
          text={`Log in with ${password ? "password" : "email"}`}
          {...(authMethod !== "email" && {
            type: "button",
            onClick: (e) => {
              e.preventDefault();
              setShowSSOOption(false);
              setAuthMethod("email");
            },
          })}
          loading={clickedMethod === "email" || isPending}
          disabled={clickedMethod && clickedMethod !== "email"}
        />
      </form>
    </>
  );
};
