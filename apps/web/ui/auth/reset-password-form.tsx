"use client";

import { authClient } from "@/lib/better-auth/auth-client";
import { passwordSchema } from "@/lib/zod/schemas/auth";
import { Button, Input } from "@dub/ui";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod/v4";
import { PasswordRequirements } from "../shared/password-requirements";

const resetPasswordFormSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Confirm password must match password",
    path: ["confirmPassword"],
  });

export const ResetPasswordForm = ({ token }: { token: string }) => {
  const router = useRouter();
  const form = useForm<z.infer<typeof resetPasswordFormSchema>>();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = handleSubmit(async (data) => {
    const parsed = resetPasswordFormSchema.safeParse(data);

    if (!parsed.success) {
      const confirmError = parsed.error.issues.find(
        (issue) => issue.path[0] === "confirmPassword",
      );

      if (confirmError) {
        form.setError("confirmPassword", { message: confirmError.message });
      }

      return;
    }

    try {
      const { error } = await authClient.resetPassword({
        newPassword: parsed.data.password,
        token,
      });

      if (error) {
        throw new Error(error.message || "Failed to reset password.");
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
