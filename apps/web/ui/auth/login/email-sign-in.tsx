"use client";

import { checkAccountExistsAction } from "@/lib/actions/check-account-exists";
import {
  authClient,
  emailOtpClient,
} from "@/lib/better-auth/auth-client";
import {
  AnimatedSizeContainer,
  Button,
  Input,
  LoadingSpinner,
  useCurrentSubdomain,
  useMediaQuery,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { OTPInput } from "input-otp";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { errorCodes, LoginFormContext } from "./login-form";

function authErrorMessage(message?: string | null) {
  if (!message) {
    return null;
  }

  return errorCodes[message as keyof typeof errorCodes] ?? message;
}

export const EmailSignIn = ({ next }: { next?: string }) => {
  const { subdomain } = useCurrentSubdomain();
  const router = useRouter();
  const searchParams = useSearchParams();
  const finalNext = next ?? searchParams?.get("next");
  const { isMobile } = useMediaQuery();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [isInvalidOtp, setIsInvalidOtp] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const otpSubmittingRef = useRef(false);

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

  const sendLoginOtp = useCallback(async () => {
    setIsSendingOtp(true);
    setClickedMethod("email");

    const { error } = await emailOtpClient.sendVerificationOtp({
      email,
      type: "sign-in",
    });

    setIsSendingOtp(false);

    if (error) {
      toast.error(
        authErrorMessage(error.message) ?? "Failed to send login code.",
      );
      setClickedMethod(undefined);
      return false;
    }

    toast.success("Code sent - check your inbox!");
    setShowOtpStep(true);
    setClickedMethod(undefined);
    return true;
  }, [email, setClickedMethod]);

  const signInWithPassword = useCallback(async () => {
    setIsSigningIn(true);
    setClickedMethod("email");

    const { error } = await authClient.signIn.email({
      email,
      password,
    });

    setIsSigningIn(false);

    if (error) {
      toast.error(
        authErrorMessage(error.message) ??
          errorCodes["invalid-credentials"],
      );
      setClickedMethod(undefined);
      return;
    }

    setLastUsedAuthMethod("email");
    router.push(finalNext || "/workspaces");
  }, [
    email,
    password,
    finalNext,
    router,
    setClickedMethod,
    setLastUsedAuthMethod,
  ]);

  const verifyLoginOtp = useCallback(async () => {
    if (otpSubmittingRef.current || isVerifyingOtp || otp.length < 6) {
      return;
    }

    otpSubmittingRef.current = true;
    setIsInvalidOtp(false);
    setIsVerifyingOtp(true);

    const { error } = await emailOtpClient.signIn({
      email,
      otp,
    });

    setIsVerifyingOtp(false);

    if (error) {
      otpSubmittingRef.current = false;
      setIsInvalidOtp(true);
      setOtp("");
      toast.error(
        authErrorMessage(error.message) ??
          "Invalid code. Please try again.",
      );
      return;
    }

    setLastUsedAuthMethod("email");
    router.push(finalNext || "/workspaces");
  }, [
    email,
    otp,
    isVerifyingOtp,
    finalNext,
    router,
    setLastUsedAuthMethod,
  ]);

  if (showOtpStep) {
    return (
      <div className="flex flex-col gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verifyLoginOtp();
          }}
        >
          <p className="text-content-subtle mb-4 text-center text-sm">
            Enter the code sent to{" "}
            <span className="text-content-emphasis font-medium">{email}</span>
          </p>
          <OTPInput
            maxLength={6}
            value={otp}
            onChange={(value) => {
              setIsInvalidOtp(false);
              setOtp(value);
            }}
            autoFocus={!isMobile}
            render={({ slots }) => (
              <div className="flex w-full items-center justify-between">
                {slots.map(({ char, isActive, hasFakeCaret }, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "relative flex h-14 w-12 items-center justify-center text-xl",
                      "rounded-lg border border-neutral-200 bg-white ring-0 transition-all",
                      isActive &&
                        "z-10 border border-neutral-800 ring-2 ring-neutral-200",
                      isInvalidOtp && "border-red-500 ring-red-200",
                    )}
                  >
                    {char}
                    {hasFakeCaret && (
                      <div className="animate-caret-blink pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="h-5 w-px bg-black" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            onComplete={verifyLoginOtp}
          />
          <AnimatedSizeContainer height>
            {isInvalidOtp && (
              <p className="pt-3 text-center text-xs font-medium text-red-500">
                Invalid code. Please try again.
              </p>
            )}
          </AnimatedSizeContainer>

          <Button
            className="mt-8"
            text={isVerifyingOtp ? "Verifying..." : "Continue"}
            type="submit"
            loading={isVerifyingOtp}
            disabled={!otp || otp.length < 6}
          />
        </form>

        <LoginResendOtp onResend={sendLoginOtp} />
      </div>
    );
  }

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
              toast.error(errorCodes["require-saml-sso"]);
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
            await signInWithPassword();
            return;
          }

          await sendLoginOtp();
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
          loading={
            clickedMethod === "email" ||
            isPending ||
            isSigningIn ||
            isSendingOtp
          }
          disabled={clickedMethod && clickedMethod !== "email"}
        />
      </form>
    </>
  );
};

const LoginResendOtp = ({
  onResend,
}: {
  onResend: () => Promise<boolean>;
}) => {
  const [delaySeconds, setDelaySeconds] = useState(0);
  const [state, setState] = useState<"default" | "success" | "error">(
    "default",
  );
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (state === "success") {
      setDelaySeconds(60);
    } else if (state === "error") {
      setDelaySeconds(5);
    }
  }, [state]);

  useEffect(() => {
    if (delaySeconds > 0) {
      const interval = setInterval(
        () => setDelaySeconds((seconds) => seconds - 1),
        1000,
      );

      return () => clearInterval(interval);
    } else if (delaySeconds === 0 && state !== "default") {
      setState("default");
    }
  }, [delaySeconds, state]);

  return (
    <div className="relative mt-4 text-center text-sm font-medium text-neutral-500">
      {state === "default" && (
        <>
          {isPending && (
            <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 pr-1.5">
              <LoadingSpinner className="h-3 w-3" />
            </div>
          )}

          <p className={cn(isPending && "opacity-80")}>
            Didn't receive a code?{" "}
            <button
              type="button"
              onClick={async () => {
                setIsPending(true);
                const ok = await onResend();
                setIsPending(false);
                setState(ok ? "success" : "error");
              }}
              className={cn(
                "font-semibold text-neutral-700 transition-colors hover:text-neutral-900",
                isPending && "pointer-events-none",
              )}
            >
              Resend
            </button>
          </p>
        </>
      )}

      {state === "success" && (
        <p className="text-sm text-neutral-500">
          Code sent successfully.{" "}
          <span className="ml-1 text-sm tabular-nums text-neutral-400">
            {delaySeconds}s
          </span>
        </p>
      )}

      {state === "error" && (
        <p className="text-sm text-neutral-500">
          Failed to send code.{" "}
          <span className="ml-1 text-sm tabular-nums text-neutral-400">
            {delaySeconds}s
          </span>
        </p>
      )}
    </div>
  );
};
