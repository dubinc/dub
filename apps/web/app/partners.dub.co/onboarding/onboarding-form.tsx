"use client";

import { onboardPartner } from "@/lib/actions/partners/onboard-partner";
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
  }>();

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        try {
          const result = await onboardPartner(data);
          if (!result?.data?.ok) throw new Error("Failed to create partner");
          router.push(`/${result?.data?.partnerId || ""}`);
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
          autoFocus={!isMobile}
          {...register("name", {
            required: true,
          })}
        />
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
