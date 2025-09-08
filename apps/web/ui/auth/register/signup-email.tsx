"use client";

import { sendOtpAction } from "@/lib/actions/send-otp";
import z from "@/lib/zod";
import { signUpSchema } from "@/lib/zod/schemas/auth";
import { showMessage } from "@/ui/auth/helpers";
import { ERegistrationStep } from "@/ui/auth/register/constants";
import { MessageType } from "@/ui/modals/auth-modal.tsx";
import { Button, Input } from "@dub/ui";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import { trackClientEvents } from "core/integration/analytic/services/analytic.service.ts";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { useRegisterContext } from "./context";

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
  const { setStep, setEmail, setPassword, step } = useRegisterContext();

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

  const { executeAsync, isPending } = useAction(sendOtpAction, {
    onSuccess: () => {
      setEmail(getValues("email"));
      setPassword(getValues("password"));
      setStep(ERegistrationStep.VERIFY);
    },
    onError: ({ error }) => {
      const serverError = error.serverError || "";
      const validationError =
        error.validationErrors?.email?.[0] ||
        error.validationErrors?.password?.[0] ||
        "";
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
          page_name: "landing",
          auth_type: "signup",
          auth_method: "email",
          email: getValues("email"),
          auth_origin: "qr",
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

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
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
            email: data.email,
            auth_origin: "qr",
            event_category: "nonAuthorized",
          },
          sessionId,
        });
        await executeAsync(data);
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
          disabled={isPending}
          loading={isPending}
          className="!mt-3"
        />
      </div>
    </form>
  );
};
