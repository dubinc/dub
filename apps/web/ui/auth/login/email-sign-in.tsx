import { checkAccountExistsAction } from "@/lib/actions/check-account-exists";
import { Button, Input, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { signIn } from "next-auth/react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useContext, useState } from "react";
import { toast } from "sonner";
import { errorCodes, LoginFormContext } from "./login-form";

export const EmailSignIn = ({ next }: { next?: string }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const finalNext = next ?? searchParams?.get("next");
  const { isMobile } = useMediaQuery();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const {
    showPasswordField,
    setShowPasswordField,
    setClickedMethod,
    authMethod,
    setAuthMethod,
    clickedMethod,
    setLastUsedAuthMethod,
    setShowSSOOption,
  } = useContext(LoginFormContext);

  const { executeAsync, isPending } = useAction(checkAccountExistsAction, {
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

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

            const { accountExists, hasPassword } = result.data;

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
            return;
          }

          const { accountExists, hasPassword } = result.data;

          if (!accountExists) {
            setClickedMethod(undefined);
            toast.error("No account found with that email address.");
            return;
          }

          const provider = password && hasPassword ? "credentials" : "email";

          const response = await signIn(provider, {
            email,
            redirect: false,
            callbackUrl: finalNext || "/workspaces",
            ...(password && { password }),
          });

          if (!response) {
            return;
          }

          if (!response.ok && response.error) {
            if (errorCodes[response.error]) {
              toast.error(errorCodes[response.error]);
            } else {
              toast.error(response.error);
            }

            setClickedMethod(undefined);
            return;
          }

          setLastUsedAuthMethod("email");

          if (provider === "email") {
            toast.success("Email sent - check your inbox!");
            setEmail("");
            setClickedMethod(undefined);
            return;
          }

          if (provider === "credentials") {
            router.push(response?.url || finalNext || "/workspaces");
          }
        }}
        className="flex flex-col gap-y-6"
      >
        {authMethod === "email" && (
          <label>
            <span className="text-content-emphasis mb-2 block text-sm font-medium leading-none">
              Email
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
