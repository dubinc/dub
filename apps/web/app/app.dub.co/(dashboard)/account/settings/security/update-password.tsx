"use client";

import { updatePasswordSchema } from "@/lib/zod/schemas/auth";
import { PasswordRequirements } from "@/ui/shared/password-requirements";
import { Button, Input, Label } from "@dub/ui";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod/v4";

// Allow the user to update their existing password
export const UpdatePassword = () => {
  const form = useForm<z.infer<typeof updatePasswordSchema>>();
  const {
    register,
    handleSubmit,
    setError,
    formState: { isSubmitting, isDirty, errors },
    reset,
  } = form;

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
      className="rounded-xl border border-neutral-200 bg-white"
      onSubmit={onSubmit}
    >
      <div className="border-neutral-200">
        <div className="flex flex-col gap-6 p-6">
          <div className="flex flex-col space-y-1">
            <h2 className="text-xl font-medium">Password</h2>
            <p className="pb-2 text-sm text-neutral-500">
              Manage your account password on {process.env.NEXT_PUBLIC_APP_NAME}
              .
            </p>
          </div>
          <div className="grid w-full max-w-sm items-center gap-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              type="password"
              {...register("currentPassword", { required: true })}
            />
            <span
              className="block text-sm text-red-500"
              role="alert"
              aria-live="assertive"
            >
              {errors.currentPassword?.message}
            </span>
          </div>

          <div className="grid w-full max-w-sm items-center gap-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              type="password"
              {...register("newPassword", { required: true })}
            />
            <FormProvider {...form}>
              <PasswordRequirements field="newPassword" className="mt-0" />
            </FormProvider>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 rounded-b-xl border-t border-neutral-200 bg-neutral-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:space-y-0 sm:py-3">
          <div className="shrink-0">
            <Button
              text="Update Password"
              loading={isSubmitting}
              disabled={!isDirty}
              type="submit"
            />
          </div>
        </div>
      </div>
    </form>
  );
};
