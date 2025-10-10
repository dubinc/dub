"use client";

import { changePreSignupEmailAction } from "@/lib/actions/pre-checkout-flow/change-email";
import z from "@/lib/zod";
import { signUpSchema } from "@/lib/zod/schemas/auth";
import { MessageType } from "@/ui/modals/auth-modal.tsx";
import { Button, Input } from "@dub/ui";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import {
  setPeopleAnalytic,
  trackClientEvents,
} from "core/integration/analytic/services/analytic.service.ts";
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

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<SignUpProps>({});

  const { executeAsync, isPending } = useAction(changePreSignupEmailAction, {
    async onSuccess() {
      setPeopleAnalytic({ signup_method: "email", $email: getValues("email") });

      setIsRedirecting(true);

      router.push("/paywall");
    },
    onError: ({ error }) => {
      showMessage(error.serverError, "error", authModal, setAuthModalMessage);
    },
  });

  const handleSubmitAction = async () => {
    await executeAsync({ email: getValues("email") });
  };

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
            auth_origin: "qr",
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
          disabled={isPending || isRedirecting}
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
