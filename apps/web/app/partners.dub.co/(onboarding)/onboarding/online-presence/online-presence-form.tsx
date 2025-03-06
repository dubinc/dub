"use client";

import { updateOnlinePresenceAction } from "@/lib/actions/partners/update-online-presence";
import { Button } from "@dub/ui";
import { cn } from "@dub/utils/src/functions";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const onlinePresenceSchema = z.object({
  website: z.string().url().optional(),
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
  youtube: z.string().optional(),
  twitter: z.string().optional(),
});

type OnlinePresenceFormData = z.infer<typeof onlinePresenceSchema>;

export function OnlinePresenceForm({ country }: { country: string | null }) {
  const router = useRouter();

  const {
    register,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<OnlinePresenceFormData>();

  const { executeAsync } = useAction(updateOnlinePresenceAction, {
    onSuccess: () => {
      router.push(country === "US" ? "/onboarding/verify" : "/programs");
    },
    onError: ({ error }) => {
      if (error.serverError) {
        toast.error(error.serverError);
      } else {
        toast.error("Failed to update online presence.");
      }

      setError("root.serverError", {
        message: error.serverError,
      });
    },
  });

  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit((data) => executeAsync(data))}
      className="flex w-full flex-col gap-4 text-left"
    >
      <label>
        <span className="text-sm font-medium text-neutral-800">Website</span>
        <input
          type="url"
          className={cn(
            "mt-2 block w-full rounded-md focus:outline-none sm:text-sm",
            errors.website
              ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
          )}
          placeholder="https://"
          {...register("website")}
        />
        <p className="mt-1.5 text-xs text-neutral-500">
          Verification may take up to 48 hours.
        </p>
      </label>

      <label>
        <span className="text-sm font-medium text-neutral-800">Instagram</span>
        <input
          type="text"
          className={cn(
            "mt-2 block w-full rounded-md focus:outline-none sm:text-sm",
            errors.instagram
              ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
          )}
          placeholder="instagram.com/handle"
          {...register("instagram")}
        />
      </label>

      <label>
        <span className="text-sm font-medium text-neutral-800">TikTok</span>
        <input
          type="text"
          className={cn(
            "mt-2 block w-full rounded-md focus:outline-none sm:text-sm",
            errors.tiktok
              ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
          )}
          placeholder="tiktok.com/@handle"
          {...register("tiktok")}
        />
      </label>

      <label>
        <span className="text-sm font-medium text-neutral-800">YouTube</span>
        <input
          type="text"
          className={cn(
            "mt-2 block w-full rounded-md focus:outline-none sm:text-sm",
            errors.youtube
              ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
          )}
          placeholder="youtube.com/handle"
          {...register("youtube")}
        />
      </label>

      <label>
        <span className="text-sm font-medium text-neutral-800">
          X (Twitter)
        </span>
        <input
          type="text"
          className={cn(
            "mt-2 block w-full rounded-md focus:outline-none sm:text-sm",
            errors.twitter
              ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
          )}
          placeholder="x.com/handle"
          {...register("twitter")}
        />
      </label>

      <Button
        type="submit"
        text="Continue"
        className="mt-2"
        loading={isSubmitting || isSubmitSuccessful}
      />
    </form>
  );
}
