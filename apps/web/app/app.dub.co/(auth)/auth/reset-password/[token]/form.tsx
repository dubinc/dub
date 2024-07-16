"use client";

import z from "@/lib/zod";
import { resetPasswordSchema } from "@/lib/zod/schemas/password";
import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export const ResetPasswordForm = () => {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();

  const {
    register,
    handleSubmit,
    formState: { isLoading, disabled, errors },
  } = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
  });

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
      <form className="flex flex-col space-y-4" onSubmit={onSubmit}>
        <input type="hidden" value={token} {...register("token")} />
        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-gray-500"
          >
            Password
          </label>
          <input
            type="password"
            placeholder="********"
            {...register("password")}
            required
            aria-invalid={errors.password ? "true" : "false"}
            className={cn(
              "w-full max-w-md rounded-md border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm",
              errors.password && "border-red-500",
            )}
          />
          {errors.password && (
            <span
              className="mt-2 block text-sm text-red-500"
              role="alert"
              aria-live="assertive"
            >
              {errors.password.message}
            </span>
          )}
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-2 block text-sm font-medium text-gray-500"
          >
            Confirm Password
          </label>
          <input
            type="password"
            placeholder="********"
            {...register("confirmPassword")}
            required
            className={cn(
              "w-full max-w-md rounded-md border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm",
              errors.confirmPassword && "border-red-500",
            )}
          />
          {errors.confirmPassword && (
            <span
              className="mt-2 block text-sm text-red-500"
              role="alert"
              aria-live="assertive"
            >
              {errors.confirmPassword.message}
            </span>
          )}
        </div>

        <Button
          text="Reset Password"
          type="submit"
          loading={isLoading}
          disabled={disabled}
        />
      </form>
    </>
  );
};
