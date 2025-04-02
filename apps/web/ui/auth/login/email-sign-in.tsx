import { checkAccountExistsAction } from "@/lib/actions/check-account-exists";
import { Button, Input, useMediaQuery } from "@dub/ui";
import { InputPassword } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { Mail } from "lucide-react";
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
        className="flex flex-col gap-y-3"
      >
        {authMethod === "email" && (
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
        )}

        {showPasswordField && (
          <div>
            <Input
              type="password"
              autoFocus={!isMobile}
              value={password}
              placeholder="Password (optional)"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}

        <Button
          text={`Continue with ${password ? "Password" : "Email"}`}
          variant="secondary"
          icon={
            password ? (
              <InputPassword className="size-4 text-neutral-600" />
            ) : (
              <Mail className="size-4 text-neutral-600" />
            )
          }
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
      {showPasswordField && (
        <Link
          href={`/forgot-password?email=${encodeURIComponent(email)}`}
          className="text-center text-xs text-neutral-500 transition-colors hover:text-black"
        >
          Forgot password?
        </Link>
      )}
    </>
  );
};
