"use client";

import z from "@/lib/zod";
import { resetPasswordSchema } from "@/lib/zod/schemas/auth";
import { Button, Input } from "@dub/ui";
import { useParams, useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { PasswordRequirements } from "../shared/password-requirements";

export const ResetPasswordForm = () => {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();

  const form = useForm<z.infer<typeof resetPasswordSchema>>();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = handleSubmit(async (data) => {
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error.message);
      }

      toast.success(
        "Your password has been reset. You can now log in with your new password.",
      );
      router.replace("/login");
    } catch (error) {
      toast.error(error.message);
    }
  });

  return (
    <>
      <form className="flex w-full flex-col gap-6" onSubmit={onSubmit}>
        <input type="hidden" value={token} {...register("token")} />

        <label>
          <span className="text-content-emphasis mb-2 block text-sm font-medium leading-none">
            Password
          </span>
          <Input
            type="password"
            {...register("password")}
            required
            autoComplete="new-password"
          />
          <FormProvider {...form}>
            <PasswordRequirements />
          </FormProvider>
        </label>

        <label>
          <span className="text-content-emphasis mb-2 block text-sm font-medium leading-none">
            Confirm password
          </span>
          <Input
            type="password"
            {...register("confirmPassword")}
            required
            autoComplete="new-password"
          />
          {errors.confirmPassword && (
            <span
              className="block text-sm text-red-500"
              role="alert"
              aria-live="assertive"
            >
              {errors.confirmPassword.message}
            </span>
          )}
        </label>

        <Button
          text="Reset Password"
          type="submit"
          loading={isSubmitting}
          disabled={isSubmitting}
        />
      </form>
    </>
  );
};
