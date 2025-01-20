"use client";
import { useTranslations } from "next-intl";

import z from "@/lib/zod";
import { updatePasswordSchema } from "@/lib/zod/schemas/auth";
import { Button, Input, Label, Tooltip } from "@dub/ui";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

// Allow the user to update their existing password
export const UpdatePassword = () => {
  const t = useTranslations("app.dub.co/(dashboard)/account/settings/security");

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
      className="rounded-lg border border-gray-200 bg-white"
      onSubmit={onSubmit}
    >
      <div>
        <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:p-10">
          <h2 className="text-xl font-medium">{t("password-label")}</h2>
          <p className="pb-2 text-sm text-gray-500">
            {t("manage-account-password-description", {
              processEnvNextPublicAppName: process.env.NEXT_PUBLIC_APP_NAME,
            })}
          </p>
        </div>
        <div className="flex flex-wrap justify-between gap-4 p-5 sm:p-10">
          <div className="grid w-full max-w-sm items-center gap-2">
            <Label htmlFor="currentPassword">
              {t("current-password-label")}
            </Label>
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
            <Label htmlFor="newPassword">{t("new-password-label")}</Label>
            <Input
              type="password"
              {...register("newPassword", { required: true })}
            />
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
            {t("password-requirements-title")}
          </p>
        </Tooltip>
        <div className="shrink-0">
          <Button
            text={t("update-password-button")}
            loading={isSubmitting}
            disabled={!isDirty}
            type="submit"
          />
        </div>
      </div>
    </form>
  );
};
