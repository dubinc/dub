"use client";

import { authClient } from "@/lib/better-auth/auth-client";
import { Button, Input } from "@dub/ui";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { PasswordRequirements } from "../shared/password-requirements";

type ResetPasswordFormData = {
  password: string;
  confirmPassword: string;
};

export const ResetPasswordForm = ({ token }: { token: string }) => {
  const router = useRouter();
  const form = useForm<ResetPasswordFormData>();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = form;

  const onSubmit = handleSubmit(async (data) => {
    if (data.password !== data.confirmPassword) {
      setError("confirmPassword", {
        message: "Confirm password must match password",
      });
      return;
    }

    try {
      const { error } = await authClient.resetPassword({
        newPassword: data.password,
        token,
      });

      if (error) {
        if (
          error.code === "PASSWORD_TOO_SHORT" ||
          error.code === "PASSWORD_TOO_LONG" ||
          error.code === "PASSWORD_REQUIREMENTS_NOT_MET"
        ) {
          setError("password", { message: error.message });
        } else {
          toast.error(error.message || "Failed to reset password.");
        }

        return;
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
    <form className="flex w-full flex-col gap-6" onSubmit={onSubmit}>
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
  );
};
