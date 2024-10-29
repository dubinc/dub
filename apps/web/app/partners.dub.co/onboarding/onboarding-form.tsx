"use client";

import { onboardPartner } from "@/lib/actions/partners/onboard-partner";
import { AlertCircleFill } from "@/ui/shared/icons";
import { Button, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils/src/functions";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function OnboardingForm() {
  const { isMobile } = useMediaQuery();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<{
    name: string;
    slug: string;
  }>();

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        try {
          const result = await onboardPartner(data);
          if (!result?.data?.ok) {
            if (result?.data?.slugConflict)
              setError("slug", {
                message: `The slug "${data.slug}" is already in use.`,
              });
            else throw new Error("Failed to create partner");
            return;
          }
          router.push(`/${result?.data?.slug}`);
        } catch (error) {
          console.error(error);
          setError("root.serverError", {
            message: "Failed to create partner profile. Please try again.",
          });
          toast.error("Failed to create partner profile. Please try again.");
        }
      })}
      className="flex w-full flex-col gap-6 text-left"
    >
      <label>
        <span className="text-sm font-medium text-gray-800">Name</span>
        <input
          type="text"
          className={cn(
            "mt-2 block w-full rounded-md focus:outline-none sm:text-sm",
            errors.name
              ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500",
          )}
          placeholder="Acme, Inc."
          {...register("name", {
            required: true,
          })}
        />
      </label>

      <label>
        <span className="text-sm font-medium text-gray-800">Partner slug</span>
        <div className="relative mt-2 flex rounded-md shadow-sm">
          <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
            partners.{process.env.NEXT_PUBLIC_APP_DOMAIN}
          </span>
          <input
            type="text"
            autoComplete="off"
            className={`${
              errors.slug
                ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500"
            } block w-full rounded-r-md focus:outline-none sm:text-sm`}
            placeholder="acme"
            {...register("slug", {
              required: true,
              minLength: 3,
              maxLength: 48,
              pattern: /^[a-zA-Z0-9\-]+$/,
            })}
          />
          {errors.slug && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <AlertCircleFill
                className="h-5 w-5 text-red-500"
                aria-hidden="true"
              />
            </div>
          )}
        </div>
        {errors.slug && (
          <span className="text-xs text-red-600">{errors.slug.message}</span>
        )}
      </label>

      <Button
        type="submit"
        text="Create partner account"
        className="mt-2"
        loading={isSubmitting || isSubmitSuccessful}
      />
    </form>
  );
}
