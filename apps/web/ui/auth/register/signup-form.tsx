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
import { FC, useState } from "react";
import { SignUpEmail } from "./signup-email";
import { SignUpOAuth } from "./signup-oauth";
import { signIn } from 'next-auth/react';
import { showMessage } from '../helpers';
import slugify from "@sindresorhus/slugify";

interface ISignUpFormProps {
  sessionId: string;
  methods?: ("email" | "google")[];
}

export const SignUpForm: FC<Readonly<ISignUpFormProps>> = ({
  sessionId,
  methods = ["email", "google"],
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
    async onSuccess({ data }) {
      if (data?.error === "email-exists") {
        return;
      }
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
        const { signupMethod, email, userToken, error } = result.data;

        if (error === "email-exists") {
          if (signupMethod !== "email") {
            const response = await signIn("credentials", {
              email: email,
              password: "defaultPassword12Secret",
              redirect: false,
            });
            if (response?.ok) {
              router.push(`/${slugify(email)}`);
            }
            return;
          }
          const response = await signIn("email", {
            email,
            redirect: false,
            callbackUrl: `/workspaces`,
          });
          if (response?.ok) {
            showMessage(
              `You’re already registered. A login link has been emailed to you. After logging in, you’ll find your QR code waiting in your account`,
              "success",
            );
          }
          return;
        }

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
      {methods.includes("google") && methods.includes("email") && (
        <div className="my-2 flex flex-shrink items-center justify-center gap-2">
          <div className="border-border-500 grow basis-0 border-b" />
          <span className="text-xs font-normal uppercase leading-none text-neutral-500">
            or
          </span>
          <div className="border-border-500 grow basis-0 border-b" />
        </div>
      )}
      <SignUpOAuth
        sessionId={sessionId}
        methods={methods}
        onEmailSubmit={handleEmailSubmit}
        isLoading={loadingState.google}
        isDisabled={isAnyLoading}
        error={errorState.method === "google" ? errorState.message : undefined}
      />
    </div>
  );
};
