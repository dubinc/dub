"use client";

import { changePreSignupEmailAction } from "@/lib/actions/pre-checkout-flow/change-email";
import { useLocalStorage } from "@dub/ui";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import {
  setPeopleAnalytic,
  setPeopleAnalyticOnce,
  trackClientEvents,
} from "core/integration/analytic/services/analytic.service.ts";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SignUpEmail } from "./signup-email";
import { SignUpOAuth } from "./signup-oauth";

export const SignUpForm = ({
  sessionId,
  methods = ["email", "google"],
}: {
  sessionId: string;
  methods?: ("email" | "google")[];
}) => {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [loadingState, setLoadingState] = useState<{
    email: boolean;
    google: boolean;
  }>({ email: false, google: false });
  const [errorState, setErrorState] = useState<{
    message: string | null;
    method: "email" | "google" | null;
  }>({ message: null, method: null });

  const [_, setSignupMethod] = useLocalStorage<"email" | "google" | null>(
    "signup-method",
    null,
  );

  const { executeAsync, isPending } = useAction(changePreSignupEmailAction, {
    async onSuccess() {
      setErrorState({ message: null, method: null });
      setIsRedirecting(true);
      router.push("/paywall");
    },
    onError: ({ error }) => {
      console.error("Action error:", error.serverError);
    },
  });

  const handleEmailSubmit = async (
    email: string,
    signupMethod: "email" | "google",
  ) => {
    setErrorState({ message: null, method: null });

    setLoadingState((prev) => ({ ...prev, [signupMethod]: true }));

    trackClientEvents({
      event: EAnalyticEvents.AUTH_ATTEMPT,
      params: {
        page_name: "landing",
        auth_type: "signup",
        auth_method: signupMethod,
        email: email,
        event_category: "nonAuthorized",
      },
      sessionId,
    });

    try {
      const result = await executeAsync({ email, signupMethod });

      if (result?.serverError) {
        const errorMessage = result.serverError.replace(/^\[.*?\]\s*/, "");

        if (errorMessage === "email-exists") {
          trackClientEvents({
            event: EAnalyticEvents.AUTH_ERROR,
            params: {
              page_name: "landing",
              auth_type: "signup",
              auth_method: signupMethod,
              email: email,
              error_code: "email-exists",
              error_message: "User with this email already exists",
              event_category: "nonAuthorized",
            },
            sessionId,
          });
        } else {
          trackClientEvents({
            event: EAnalyticEvents.AUTH_ERROR,
            params: {
              page_name: "landing",
              auth_type: "signup",
              auth_method: signupMethod,
              email: email,
              error_code: "signup-error",
              error_message: "Something went wrong with signup",
              event_category: "nonAuthorized",
            },
            sessionId,
          });
        }

        setErrorState({ message: errorMessage, method: signupMethod });
      } else if (result?.data) {
        const { signupMethod, email, userToken } = result.data;
        setPeopleAnalytic({
          signup_method: signupMethod,
          $email: email,
        });

        if (userToken) {
          setPeopleAnalyticOnce({ user_token: userToken });
        }

        if (signupMethod) {
          setSignupMethod(signupMethod);
        }
      }
    } finally {
      setLoadingState((prev) => ({ ...prev, [signupMethod]: false }));
    }
  };

  const isAnyLoading =
    loadingState.email || loadingState.google || isPending || isRedirecting;

  return (
    <div className="flex flex-col gap-3 p-1">
      <SignUpOAuth
        sessionId={sessionId}
        methods={methods}
        onEmailSubmit={handleEmailSubmit}
        isLoading={loadingState.google}
        isDisabled={isAnyLoading}
        error={errorState.method === "google" ? errorState.message : undefined}
      />
      {methods.includes("google") && methods.includes("email") && (
        <div className="my-2 flex flex-shrink items-center justify-center gap-2">
          <div className="border-border-500 grow basis-0 border-b" />
          <span className="text-xs font-normal uppercase leading-none text-neutral-500">
            or
          </span>
          <div className="border-border-500 grow basis-0 border-b" />
        </div>
      )}
      {methods.includes("email") && (
        <SignUpEmail
         sessionId={sessionId}
          onEmailSubmit={handleEmailSubmit}
          isLoading={loadingState.email}
          isDisabled={isAnyLoading}
          error={
            errorState.method === "email"
              ? errorState.message || undefined
              : undefined
          }
        />
      )}
    </div>
  );
};
