"use client";

import z from "@/lib/zod";
import { updatePasswordSchema } from "@/lib/zod/schemas/auth";
import { Button, Input, Label } from "@dub/ui";
import { Tooltip } from "@dub/ui/src/tooltip";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

// Allow the user to update their existing password
export const UpdatePassword = () => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { isSubmitting, disabled, errors },
    reset,
  } = useForm<z.infer<typeof updatePasswordSchema>>({
    resolver: zodResolver(updatePasswordSchema),
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      const response = await fetch("/api/user/password", {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const { error } = await response.json();
        setError("currentPassword", { message: error.message });
        return;
      }

      reset();
      toast.success("Your password has been updated.");
    } catch (error) {
      toast.error(error.message);
    }
  });

  return (
    <form
      className="rounded-lg border border-gray-200 bg-white"
      onSubmit={onSubmit}
    >
      <div>
        <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:p-10">
          <h2 className="text-xl font-medium">Password</h2>
          <p className="pb-2 text-sm text-gray-500">
            Manage your account password on {process.env.NEXT_PUBLIC_APP_NAME}.
          </p>
        </div>
        <div className="flex flex-wrap justify-between gap-y-4 p-5 sm:gap-x-4 sm:gap-y-0 sm:p-10">
          <div className="grid w-full max-w-sm items-center gap-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input type="password" {...register("currentPassword")} required />
          </div>

          <div className="grid w-full max-w-sm items-center gap-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input type="password" {...register("newPassword")} required />
          </div>
        </div>

        <div className="flex flex-wrap justify-between">
          <div className="grid w-full max-w-sm items-center gap-2">
            <span
              className="block text-sm text-red-500"
              role="alert"
              aria-live="assertive"
            >
              {errors.currentPassword?.message}
            </span>
          </div>

          <div className="grid w-full max-w-sm items-center gap-2">
            <span
              className="block text-sm text-red-500"
              role="alert"
              aria-live="assertive"
            >
              {errors.newPassword?.message}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between space-x-4 rounded-b-lg border-t border-gray-200 bg-gray-50 p-3 sm:px-10">
        <Tooltip content="Passwords must be at least 8 characters long containing at least one number, one uppercase, and one lowercase letter.">
          <p className="text-sm text-gray-500 underline decoration-dotted underline-offset-2 hover:text-gray-700">
            Password requirements
          </p>
        </Tooltip>
        <div className="shrink-0">
          <Button
            text="Update Password"
            loading={isSubmitting}
            disabled={disabled}
            type="submit"
          />
        </div>
      </div>
    </form>
  );
};
