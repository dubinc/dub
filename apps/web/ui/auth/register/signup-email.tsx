"use client";

import { createUserAccountAction } from "@/lib/actions/create-user-account";
import z from "@/lib/zod";
import { signUpSchema } from "@/lib/zod/schemas/auth";
import { MessageType } from "@/ui/modals/auth-modal.tsx";
import { QRBuilderData } from "@/ui/qr-builder/types/types";
import { Button, Input, useLocalStorage } from "@dub/ui";
import slugify from "@sindresorhus/slugify";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import {
  setPeopleAnalyticOnce,
  trackClientEvents,
} from "core/integration/analytic/services/analytic.service.ts";
import { signIn } from "next-auth/react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { showMessage } from "../helpers";

type SignUpProps = z.infer<typeof signUpSchema>;

export const SignUpEmail = ({
  sessionId,
  authModal,
  setAuthModalMessage,
}: {
  sessionId;
  authModal?: boolean;
  setAuthModalMessage?: (message: string | null, type: MessageType) => void;
}) => {
  const router = useRouter();

  const [isRedirecting, setIsRedirecting] = useState(false);

  // const { setStep, setEmail, setPassword, step } = useRegisterContext();
  const [qrDataToCreate, setQrDataToCreate] =
    useLocalStorage<QRBuilderData | null>("qr-data-to-create", null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<SignUpProps>({
    defaultValues: {
      password: "defaultPassword12Secret",
    },
  });

  const { executeAsync, isPending } = useAction(createUserAccountAction, {
    async onSuccess() {
      const email = getValues("email");

      trackClientEvents({
        event: EAnalyticEvents.AUTH_SUCCESS,
        params: {
          page_name: "profile",
          auth_type: "signup",
          auth_method: "email",
          auth_origin: qrDataToCreate ? "qr" : "none",
          email,
          event_category: "Authorized",
        },
        sessionId,
      });
      setPeopleAnalyticOnce({ signup_method: "email" });

      showMessage(
        "Account created! Redirecting to dashboard...",
        "success",
        authModal,
        setAuthModalMessage,
      );
      setIsRedirecting(true);
      setQrDataToCreate(null);
      const response = await signIn("credentials", {
        email,
        password: getValues("password"),
        redirect: false,
      });

      if (response?.ok) {
        router.push(`/${slugify(email)}?onboarded=true`);
      } else {
        showMessage(
          "Failed to sign in with credentials. Please try again or contact support.",
          "error",
          authModal,
          setAuthModalMessage,
        );
      }
    },
    onError({ error }) {
      const email = getValues("email");

      const serverError = error.serverError || "";
      const validationError = error.validationErrors?.code?.[0] || "";
      const fullErrorMessage =
        serverError || validationError || "An error occurred";

      const codeMatch = fullErrorMessage.match(/^\[([^\]]+)\]/);
      const errorCode = codeMatch ? codeMatch[1] : "unknown-error";
      const errorMessage = codeMatch
        ? fullErrorMessage.replace(/^\[[^\]]+\]\s*/, "")
        : fullErrorMessage;

      trackClientEvents({
        event: EAnalyticEvents.AUTH_ERROR,
        params: {
          page_name: "profile",
          auth_type: "signup",
          auth_method: "email",
          auth_origin: qrDataToCreate ? "qr" : "none",
          email,
          event_category: "nonAuthorized",
          error_code: errorCode,
          error_message: errorMessage,
        },
        sessionId,
      });

      console.error("Auth error:", { code: errorCode, message: errorMessage });

      showMessage(errorMessage, "error", authModal, setAuthModalMessage);
    },
  });

  const handleSubmitAction = async () => {
    await executeAsync({
      email: getValues("email"),
      password: getValues("password"),
      // code,
      qrDataToCreate,
    });
  };
  // const { executeAsync, isPending } = useAction(sendOtpAction, {
  //   onSuccess: () => {
  //     setEmail(getValues("email"));
  //     setPassword(getValues("password"));
  //     setStep(ERegistrationStep.VERIFY);
  //   },
  //   onError: ({ error }) => {
  //     const serverError = error.serverError || "";
  //     const validationError =
  //       error.validationErrors?.email?.[0] ||
  //       error.validationErrors?.password?.[0] ||
  //       "";
  //     const fullErrorMessage =
  //       serverError || validationError || "An error occurred";

  //     const codeMatch = fullErrorMessage.match(/^\[([^\]]+)\]/);
  //     const errorCode = codeMatch ? codeMatch[1] : "unknown-error";
  //     const errorMessage = codeMatch
  //       ? fullErrorMessage.replace(/^\[[^\]]+\]\s*/, "")
  //       : fullErrorMessage;

  //     trackClientEvents({
  //       event: EAnalyticEvents.AUTH_ERROR,
  //       params: {
  //         page_name: "landing",
  //         auth_type: "signup",
  //         auth_method: "email",
  //         email: getValues("email"),
  //         auth_origin: qrDataToCreate ? "qr" : "none",
  //         event_category: "nonAuthorized",
  //         error_code: errorCode,
  //         error_message: errorMessage,
  //       },
  //       sessionId,
  //     });

  //     console.error("Auth error:", { code: errorCode, message: errorMessage });

  //     showMessage(errorMessage, "error", authModal, setAuthModalMessage);
  //   },
  // });

  return (
    <form
      onSubmit={handleSubmit(async () => {
        trackClientEvents({
          event: EAnalyticEvents.ELEMENT_CLICKED,
          params: {
            page_name: "landing",
            element_name: "signup",
            content_value: "email",
            event_category: "nonAuthorized",
          },
          sessionId,
        });

        trackClientEvents({
          event: EAnalyticEvents.AUTH_ATTEMPT,
          params: {
            page_name: "landing",
            auth_type: "signup",
            auth_method: "email",
            email: getValues("email"),
            auth_origin: qrDataToCreate ? "qr" : "none",
            event_category: "nonAuthorized",
          },
          sessionId,
        });

        await handleSubmitAction();
      })}
    >
      <div className="flex flex-col space-y-4">
        <Input
          type="email"
          placeholder="Your Email"
          autoComplete="off"
          required
          {...register("email")}
          error={errors.email?.message}
          className="border-border-500 focus:border-secondary"
        />
        <Input
          containerClassName="hidden"
          type="password"
          placeholder="Password"
          required
          {...register("password")}
          error={errors.password?.message}
          minLength={8}
        />
        <Button
          type="submit"
          text={isPending ? "Submitting..." : "Sign Up"}
          disabled={isPending || isRedirecting}
          loading={isPending || isRedirecting}
          className="!mt-3"
        />
      </div>
    </form>
  );
};
