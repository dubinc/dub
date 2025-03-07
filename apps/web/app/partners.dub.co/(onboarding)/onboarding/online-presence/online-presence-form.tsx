"use client";

import { updateOnlinePresenceAction } from "@/lib/actions/partners/update-online-presence";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { DomainVerificationModal } from "@/ui/modals/domain-verification-modal";
import {
  Button,
  CircleCheckFill,
  Globe,
  Instagram,
  TikTok,
  Twitter,
  YouTube,
} from "@dub/ui";
import { cn } from "@dub/utils/src/functions";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { z } from "zod";

const onlinePresenceSchema = z.object({
  website: z.string().url().optional(),
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
  youtube: z.string().optional(),
  twitter: z.string().optional(),
});

type OnlinePresenceFormData = z.infer<typeof onlinePresenceSchema>;

interface OnlinePresenceFormProps {
  country: string | null;
  partner?: {
    website: string | null;
    instagram: string | null;
    tiktok: string | null;
    youtube: string | null;
    twitter: string | null;
  } | null;
}

export function OnlinePresenceForm({
  country,
  partner,
}: OnlinePresenceFormProps) {
  const router = useRouter();

  const { partner: partnerProfile } = usePartnerProfile();

  const {
    register,
    setError,
    watch,
    getValues,
    handleSubmit,
    getFieldState,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<OnlinePresenceFormData>({
    defaultValues: {
      website: partner?.website || undefined,
      instagram: partner?.instagram || undefined,
      tiktok: partner?.tiktok || undefined,
      youtube: partner?.youtube || undefined,
      twitter: partner?.twitter || undefined,
    },
  });

  const website = watch("website");

  const { executeAsync } = useAction(updateOnlinePresenceAction, {
    onSuccess: (result) => {
      if (!result?.data?.success)
        setError("root.serverError", {
          message: "Failed to update online presence",
        });
      else mutate("/api/partner-profile");
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

  const [domainVerificationData, setDomainVerificationData] = useState<{
    domain: string;
    txtRecord: string;
  } | null>(null);

  const [isSavingWebsite, setIsSavingWebsite] = useState(false);

  const isWebsiteVerified =
    website === partnerProfile?.website &&
    Boolean(partnerProfile?.websiteVerifiedAt);

  return (
    <>
      <DomainVerificationModal
        showDomainVerificationModal={domainVerificationData !== null}
        setShowDomainVerificationModal={() => setDomainVerificationData(null)}
        domain={domainVerificationData?.domain || ""}
        txtRecord={domainVerificationData?.txtRecord || ""}
      />
      <form
        onSubmit={handleSubmit(async (data) => {
          const result = await executeAsync(data);

          if (result?.data?.success)
            router.push(country === "US" ? "/onboarding/verify" : "/programs");
        })}
        className="flex w-full flex-col gap-4 text-left"
      >
        <label>
          <span className="text-sm font-medium text-neutral-800">Website</span>
          <div className="relative">
            <input
              type="url"
              className={cn(
                "mt-2 block w-full rounded-md focus:outline-none sm:text-sm",
                errors.website
                  ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
              )}
              placeholder="https://example.com"
              {...register("website")}
            />
            <Button
              className={cn(
                "absolute right-1.5 top-1/2 h-7 w-fit -translate-y-1/2 px-2.5",
                isWebsiteVerified &&
                  "border-green-100 bg-green-100 text-green-700",
              )}
              variant="secondary"
              text={isWebsiteVerified ? "Verified" : "Verify"}
              icon={
                isWebsiteVerified ? (
                  <CircleCheckFill className="size-4 text-green-700" />
                ) : (
                  <Globe className="size-4" />
                )
              }
              loading={isSavingWebsite || !partnerProfile}
              disabled={
                !website ||
                getFieldState("website").invalid ||
                isWebsiteVerified
              }
              onClick={async () => {
                setIsSavingWebsite(true);
                try {
                  const result = await updateOnlinePresenceAction({
                    website: getValues("website"),
                  });

                  try {
                    if (
                      !result?.data?.website ||
                      !result?.data?.websiteTxtRecord
                    ) {
                      throw new Error(
                        "Missing website or TXT record in update result",
                      );
                    }

                    setDomainVerificationData({
                      domain: new URL(result.data.website).hostname,
                      txtRecord: result.data.websiteTxtRecord,
                    });
                  } catch (e) {
                    toast.error("Failed to start website verification");
                    console.error("Failed to start website verification", e);
                  }

                  mutate("/api/partner-profile");
                } finally {
                  setIsSavingWebsite(false);
                }
              }}
            />
          </div>
          <p className="mt-1.5 text-xs text-neutral-500">
            Verification may take up to 48 hours.
          </p>
        </label>

        <label>
          <span className="text-sm font-medium text-neutral-800">
            Instagram
          </span>
          <div className="relative">
            <div className="mt-2 flex rounded-md">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
                instagram.com/
              </span>
              <input
                type="text"
                className={cn(
                  "block w-full rounded-none rounded-r-md focus:outline-none sm:text-sm",
                  errors.instagram
                    ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
                )}
                placeholder="handle"
                {...register("instagram")}
              />
            </div>
            <Button
              className="absolute right-1.5 top-1/2 h-7 w-fit -translate-y-1/2 px-2.5"
              variant="secondary"
              text="Verify"
              icon={<Instagram className="size-3.5" />}
              onClick={() => alert("WIP")}
            />
          </div>
        </label>

        <label>
          <span className="text-sm font-medium text-neutral-800">TikTok</span>
          <div className="relative">
            <div className="mt-2 flex rounded-md">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
                tiktok.com/@
              </span>
              <input
                type="text"
                className={cn(
                  "block w-full rounded-none rounded-r-md focus:outline-none sm:text-sm",
                  errors.tiktok
                    ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
                )}
                placeholder="handle"
                {...register("tiktok")}
              />
            </div>
            <Button
              className="absolute right-1.5 top-1/2 h-7 w-fit -translate-y-1/2 px-2.5"
              variant="secondary"
              text="Verify"
              icon={<TikTok className="size-3.5" />}
              onClick={() => alert("WIP")}
            />
          </div>
        </label>

        <label>
          <span className="text-sm font-medium text-neutral-800">YouTube</span>
          <div className="relative">
            <div className="mt-2 flex rounded-md">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
                youtube.com/@
              </span>
              <input
                type="text"
                className={cn(
                  "block w-full rounded-none rounded-r-md focus:outline-none sm:text-sm",
                  errors.youtube
                    ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
                )}
                placeholder="handle"
                {...register("youtube")}
              />
            </div>
            <Button
              className="absolute right-1.5 top-1/2 h-7 w-fit -translate-y-1/2 px-2.5"
              variant="secondary"
              text="Verify"
              icon={<YouTube className="size-3.5" />}
              onClick={() => alert("WIP")}
            />
          </div>
        </label>

        <label>
          <span className="text-sm font-medium text-neutral-800">
            X/Twitter
          </span>
          <div className="relative">
            <div className="mt-2 flex rounded-md">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
                x.com/
              </span>
              <input
                type="text"
                className={cn(
                  "block w-full rounded-none rounded-r-md focus:outline-none sm:text-sm",
                  errors.twitter
                    ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
                )}
                placeholder="handle"
                {...register("twitter")}
              />
            </div>
            <Button
              className="absolute right-1.5 top-1/2 h-7 w-fit -translate-y-1/2 px-2.5"
              variant="secondary"
              text="Verify"
              icon={<Twitter className="size-3.5" />}
              onClick={() => alert("WIP")}
            />
          </div>
        </label>

        <Button
          type="submit"
          text="Continue"
          className="mt-2"
          loading={isSubmitting || isSubmitSuccessful}
        />
      </form>
    </>
  );
}
