import { emailSchema } from "@/lib/zod/schemas/auth";
import { Button, Input, useMediaQuery } from "@dub/ui";
import { InputPassword } from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import { Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useContext, useState } from "react";
import { toast } from "sonner";
import { errorCodes, LoginFormContext } from "./login-form";

export const EmailSignIn = ({ redirectTo }: { redirectTo?: string }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams?.get("next");
  const { isMobile } = useMediaQuery();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checkingEmailPassword, setCheckingEmailPassword] = useState(false);

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

  return (
    <>
      <form
        onSubmit={async (e) => {
          e.preventDefault();

          // Check if the user can enter a password, and if so display the field
          if (!showPasswordField) {
            const { success } = emailSchema.safeParse(email);

            if (success) {
              try {
                setCheckingEmailPassword(true);
                const res = await fetch("/api/auth/account-exists", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email }),
                });
                setCheckingEmailPassword(false);

                const { accountExists, hasPassword } = await res.json();
                if (accountExists && hasPassword) {
                  setShowPasswordField(true);
                  return;
                }
              } catch (e) {
                console.error("Failed to determine if user has password", e);
              }
            }
          }

          setClickedMethod("email");

          fetch("/api/auth/account-exists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          }).then(async (res) => {
            if (!res.ok) {
              const error = await res.text();
              toast.error(error);
              setClickedMethod(undefined);
              return;
            }

            const { accountExists, hasPassword } = await res.json();

            if (!accountExists) {
              setClickedMethod(undefined);
              toast.error("No account found with that email address.");
              return;
            }

            const provider = hasPassword && password ? "credentials" : "email";

            const response = await signIn(provider, {
              email,
              redirect: false,
              callbackUrl: next || redirectTo || "/workspaces",
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
              router.push(response?.url || redirectTo || "/workspaces");
            }
          });
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
              "block w-full min-w-0 appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm",
              {
                "pr-10": checkingEmailPassword,
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
              <InputPassword className="size-4 text-gray-600" />
            ) : (
              <Mail className="size-4 text-gray-600" />
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
          loading={checkingEmailPassword || clickedMethod === "email"}
          disabled={clickedMethod && clickedMethod !== "email"}
        />
      </form>
      {showPasswordField && (
        <Link
          href={`/forgot-password?email=${encodeURIComponent(email)}`}
          className="text-center text-xs text-gray-500 transition-colors hover:text-black"
        >
          Forgot password?
        </Link>
      )}
    </>
  );
};
