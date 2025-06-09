"use client";

import z from "@/lib/zod";
import { updatePasswordSchema } from "@/lib/zod/schemas/auth";
import { Button } from "@dub/ui";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export const TwoFactorAuth = () => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { isSubmitting, isDirty, errors },
    reset,
  } = useForm<z.infer<typeof updatePasswordSchema>>();

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
      className="rounded-lg border border-neutral-200 bg-white"
      onSubmit={onSubmit}
    >
      <div>
        <div className="flex flex-col gap-3 border-b border-neutral-200 p-5 sm:p-10">
          <h2 className="text-xl font-medium">Two-factor Authentication</h2>
          <p className="pb-2 text-sm text-neutral-500">
            Once two-factor is enabled you will have to provide two methods of
            authentication in order to sign in into your account.
          </p>
        </div>

        <div className="flex flex-wrap justify-between gap-4 px-5 py-4 sm:px-10">
          <div className="flex w-full items-center justify-between rounded-lg border border-neutral-200 bg-white p-5">
            <div>
              <div className="font-semibold text-neutral-900">
                Authenticator App (TOTP)
              </div>
              <div className="text-sm text-neutral-500">
                Generate codes using an app like Google Authenticator or Okta
                Verify.
              </div>
            </div>
            <Button
              text="Enable Two-factor"
              type="button"
              className="ml-4 w-fit"
            />
          </div>
        </div>
      </div>
    </form>
  );
};
