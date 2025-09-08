import { checkAccountExistsAction } from "@/lib/actions/check-account-exists";
import { showMessage } from "@/ui/auth/helpers";
import { MessageType } from "@/ui/modals/auth-modal.tsx";
import { Button, Input, useMediaQuery } from "@dub/ui";
import { InputPassword } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import { trackClientEvents } from "core/integration/analytic/services/analytic.service.ts";
import { Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FC, useContext, useState } from "react";
import { errorCodes, LoginFormContext } from "./login-form";

interface IEmailSignInProps {
  sessionId: string;
  redirectTo?: string;
  authModal?: boolean;
  setAuthModalMessage?: (message: string | null, type: MessageType) => void;
}

export const EmailSignIn: FC<Readonly<IEmailSignInProps>> = ({
  sessionId,
  redirectTo,
  authModal,
  setAuthModalMessage,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams?.get("next");
  const { isMobile } = useMediaQuery();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const {
    showPasswordField,
    // setShowPasswordField,
    setClickedMethod,
    authMethod,
    setAuthMethod,
    clickedMethod,
    setLastUsedAuthMethod,
    setShowSSOOption,
  } = useContext(LoginFormContext);

  const { executeAsync, isPending } = useAction(checkAccountExistsAction, {
    onError: ({ error }) => {
      showMessage(error.serverError, "error", authModal, setAuthModalMessage);
    },
  });

  return (
    <>
      <form
        onSubmit={async (e) => {
          e.preventDefault();

          trackClientEvents({
            event: EAnalyticEvents.ELEMENT_CLICKED,
            params: {
              page_name: "landing",
              element_name: "login",
              content_value: "email",
              event_category: "nonAuthorized",
            },
            sessionId,
          });

          trackClientEvents({
            event: EAnalyticEvents.AUTH_ATTEMPT,
            params: {
              page_name: "landing",
              auth_type: "login",
              auth_method: "email",
              email: email,
              event_category: "nonAuthorized",
            },
            sessionId,
          });

          // Check if the user can enter a password, and if so display the field
          if (!showPasswordField) {
            const result = await executeAsync({ email });

            if (!result?.data) {
              return;
            }

            const { accountExists, hasPassword } = result.data;

            // @USEFUL_FEATURE: display password field to login
            // if (accountExists && hasPassword) {
            //   setShowPasswordField(true);
            //   return;
            // }

            if (!accountExists) {
              setClickedMethod(undefined);

              trackClientEvents({
                event: EAnalyticEvents.AUTH_ERROR,
                params: {
                  page_name: "landing",
                  auth_type: "login",
                  auth_method: "email",
                  email: email,
                  event_category: "nonAuthorized",
                  error_code: "user-not-found",
                  error_message: "No account found with that email address.",
                },
                sessionId,
              });

              showMessage(
                "No account found with that email address.",
                "error",
                authModal,
                setAuthModalMessage,
              );
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

            trackClientEvents({
              event: EAnalyticEvents.AUTH_ERROR,
              params: {
                page_name: "landing",
                auth_type: "login",
                auth_method: "email",
                email: email,
                event_category: "nonAuthorized",
                error_code: "user-not-found",
                error_message: "No account found with that email address.",
              },
              sessionId,
            });

            showMessage(
              "No account found with that email address.",
              "error",
              authModal,
              setAuthModalMessage,
            );
            return;
          }

          const provider = password && hasPassword ? "credentials" : "email";

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
              showMessage(
                errorCodes[response.error],
                "error",
                authModal,
                setAuthModalMessage,
              );
            } else {
              showMessage(
                response.error,
                "error",
                authModal,
                setAuthModalMessage,
              );
            }

            trackClientEvents({
              event: EAnalyticEvents.AUTH_ERROR,
              params: {
                page_name: "landing",
                auth_type: "login",
                auth_method: "email",
                email: email,
                event_category: "nonAuthorized",
                error_code: response.error,
                error_message: errorCodes[response.error]
                  ? errorCodes[response.error]
                  : "Error sending sign-in link.",
              },
              sessionId,
            });

            setClickedMethod(undefined);
            return;
          }

          setLastUsedAuthMethod("email");

          if (provider === "email") {
            showMessage(
              "Email sent - check your inbox!",
              "success",
              authModal,
              setAuthModalMessage,
            );
            setEmail("");
            setClickedMethod(undefined);
            return;
          }

          if (provider === "credentials") {
            router.push(response?.url || redirectTo || "/workspaces");
          }
        }}
        className="flex flex-col gap-y-3"
      >
        {/* {authMethod === "email" && ( */}
        <input
          id="email"
          name="email"
          autoFocus={!isMobile && !showPasswordField}
          type="email"
          placeholder="example@domain.com"
          autoComplete="off"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          size={1}
          className={cn(
            "border-border-500 focus:border-secondary block w-full min-w-0 appearance-none rounded-md border px-3 py-2 placeholder-neutral-400 shadow-sm focus:outline-none sm:text-sm",
            {
              "pr-10": isPending,
            },
          )}
        />
        {/* )} */}

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
          variant="primary"
          icon={
            password ? (
              <InputPassword className="size-4 text-neutral-600" />
            ) : (
              <Mail className="size-4 text-white" />
            )
          }
          type="submit"
          /*
          {...(authMethod !== "email" && {
            type: "button",
            onClick: (e) => {
              e.preventDefault();
              setShowSSOOption(false);
              setAuthMethod("email");
            },
          })}
          */
          loading={clickedMethod === "email" || isPending}
          disabled={clickedMethod && clickedMethod !== "email"}
          className="border-border-500"
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
