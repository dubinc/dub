"use client";

import z from "@/lib/zod";
import { signUpSchema } from "@/lib/zod/schemas/auth";
import { Button, Input } from "@dub/ui";
import { useForm } from "react-hook-form";

type SignUpProps = z.infer<typeof signUpSchema>;

export const SignUpEmail = ({
  onEmailSubmit,
  isLoading,
  isDisabled,
  error,
}: {
  onEmailSubmit: (
    email: string,
    signupMethod: "email" | "google",
  ) => Promise<void>;
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
            text={isLoading ? "Submitting..." : "Continue"}
            disabled={isDisabled}
            loading={isLoading}
            className="!mt-3"
          />
        </div>
      </form>
    </div>
  );
};
