"use client";

import z from "@/lib/zod";
import { signUpSchema } from "@/lib/zod/schemas/auth";
import { Button, Input } from "@dub/ui";
import { S } from "@upstash/redis/zmscore-b6b93f14";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import { useForm } from "react-hook-form";

type SignUpProps = z.infer<typeof signUpSchema>;

export const SignUpEmail = ({
  sessionId,
  onEmailSubmit,
  isLoading,
  isDisabled,
  error,
}: {
  onEmailSubmit: (
    email: string,
    signupMethod: "email" | "google",
  ) => Promise<void>;
  sessionId: string;
  isLoading?: boolean;
  isDisabled?: boolean;
  error?: string;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<SignUpProps>({});

  const handleSubmitAction = async () => {
    const email = getValues("email");

    trackClientEvents({
      event: EAnalyticEvents.ELEMENT_CLICKED,
      params: {
        page_name: "landing",
        element_name: "signup",
        content_value: "email",
        email: getValues("email"),
        event_category: "nonAuthorized",
      },
      sessionId: sessionId!,
    });

    await onEmailSubmit(email, "email");
  };

  return (
    <div className="flex flex-col">
      <form onSubmit={handleSubmit(handleSubmitAction)}>
        <div className="flex flex-col space-y-4">
          <Input
            type="email"
            placeholder="Your Email"
            autoComplete="off"
            required
            {...register("email")}
            error={errors.email?.message || error}
            className="border-border-500 focus:border-secondary"
            disabled={isDisabled}
          />
          <Button
            type="submit"
            text={isLoading ? "Submitting..." : "Sign Up"}
            disabled={isDisabled}
            loading={isLoading}
            className="!mt-3"
          />
        </div>
      </form>
    </div>
  );
};
