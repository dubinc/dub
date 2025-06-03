"use client";

import { sendOtpAction } from "@/lib/actions/send-otp";
import z from "@/lib/zod";
import { signUpSchema } from "@/lib/zod/schemas/auth";
import { PasswordRequirements } from "@/ui/shared/password-requirements";
import { Button, Input, useMediaQuery } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { FormEvent, useCallback, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRegisterContext } from "./context";

type SignUpProps = z.infer<typeof signUpSchema>;

export const SignUpEmail = () => {
  const { isMobile } = useMediaQuery();

  const { setStep, setEmail, setPassword, email, lockEmail } =
    useRegisterContext();

  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<SignUpProps>({
    defaultValues: {
      email,
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = form;

  const { executeAsync, isPending } = useAction(sendOtpAction, {
    onSuccess: () => {
      setEmail(getValues("email"));
      setPassword(getValues("password"));
      setStep("verify");
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError ||
          error.validationErrors?.email?.[0] ||
          error.validationErrors?.password?.[0],
      );
    },
  });

  const onSubmit = useCallback(
    (e: FormEvent) => {
      const { email, password } = getValues();

      if (email && !password && !showPassword) {
        e.preventDefault();
        e.stopPropagation();
        setShowPassword(true);
        return;
      }

      handleSubmit(async (data) => await executeAsync(data))(e);
    },
    [getValues, showPassword, handleSubmit, executeAsync],
  );

  return (
    <form onSubmit={onSubmit}>
      <div className="flex flex-col gap-y-6">
        <label>
          <span className="text-content-emphasis mb-2 block text-sm font-medium leading-none">
            Email
          </span>
          <Input
            type="email"
            placeholder="panic@thedis.co"
            autoComplete="email"
            required
            readOnly={!errors.email && lockEmail}
            autoFocus={!isMobile && !showPassword && !lockEmail}
            {...register("email")}
            error={errors.email?.message}
          />
        </label>
        {showPassword && (
          <label>
            <span className="text-content-emphasis mb-2 block text-sm font-medium leading-none">
              Password
            </span>
            <Input
              type="password"
              required
              autoFocus={!isMobile}
              {...register("password")}
              error={errors.password?.message}
              minLength={8}
            />
            <FormProvider {...form}>
              <PasswordRequirements />
            </FormProvider>
          </label>
        )}
        <Button
          type="submit"
          text={isPending ? "Submitting..." : "Sign Up"}
          disabled={isPending}
          loading={isPending}
        />
      </div>
    </form>
  );
};
