"use client";

import { updateOnlinePresenceAction } from "@/lib/actions/partners/update-online-presence";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { DomainVerificationModal } from "@/ui/modals/domain-verification-modal";
import {
  Button,
  CircleCheckFill,
  Globe,
  Icon,
  TikTok,
  Twitter,
  YouTube,
} from "@dub/ui";
import { cn } from "@dub/utils/src/functions";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { ReactNode, useCallback, useState } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
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
  variant?: "onboarding" | "settings";
  partner?: {
    website: string | null;
    instagram: string | null;
    tiktok: string | null;
    youtube: string | null;
    twitter: string | null;
  } | null;
  onSubmitSuccessful?: () => void;
}

export function OnlinePresenceForm({
  variant = "onboarding",
  partner,
  onSubmitSuccessful,
}: OnlinePresenceFormProps) {
  const form = useForm<OnlinePresenceFormData>({
    defaultValues: {
      website: partner?.website || undefined,
      instagram: partner?.instagram || undefined,
      tiktok: partner?.tiktok || undefined,
      youtube: partner?.youtube || undefined,
      twitter: partner?.twitter || undefined,
    },
  });

  const {
    register,
    setError,
    getValues,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = form;

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

  const startVerification = useOAuthVerification(variant);

  return (
    <>
      <DomainVerificationModal
        showDomainVerificationModal={domainVerificationData !== null}
        setShowDomainVerificationModal={() => setDomainVerificationData(null)}
        domain={domainVerificationData?.domain || ""}
        txtRecord={domainVerificationData?.txtRecord || ""}
      />
      <FormProvider {...form}>
        <form
          onSubmit={handleSubmit(async (data) => {
            const result = await executeAsync(data);

            if (result?.data?.success) onSubmitSuccessful?.();
          })}
        >
          <div
            className={cn(
              "flex w-full flex-col gap-4 text-left",
              variant === "settings" && "gap-0 divide-y divide-neutral-200 p-5",
            )}
          >
            <FormRow
              variant={variant}
              label="Website"
              input={
                <input
                  type="url"
                  className={cn(
                    "block w-full rounded-md focus:outline-none sm:text-sm",
                    errors.website
                      ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
                  )}
                  placeholder="https://example.com"
                  {...register("website")}
                />
              }
              button={
                <VerifyButton
                  property="website"
                  verifiedAtField="websiteVerifiedAt"
                  icon={Globe}
                  onClick={async () => {
                    try {
                      const result = await updateOnlinePresenceAction({
                        website: getValues("website"),
                      });

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

                      mutate("/api/partner-profile");
                    } catch (e) {
                      toast.error("Failed to start website verification");
                      console.error("Failed to start website verification", e);
                    }

                    return false;
                  }}
                />
              }
            />

            {/* TODO: Add Instagram verification */}
            {/* <FormRow
              variant={variant}
              label="Instagram"
              input={
                <div className="flex rounded-md">
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
                    onPaste={onPasteSocial}
                    {...register("instagram")}
                  />
                </div>
              }
              button={
                <VerifyButton
                  property="instagram"
                  verifiedAtField="instagramVerifiedAt"
                  icon={Instagram}
                  onClick={() =>
                    startVerification("instagram", getValues("instagram"))
                  }
                />
              }
            /> */}

            <FormRow
              variant={variant}
              label="TikTok"
              input={
                <div className="flex rounded-md">
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
                    onPaste={onPasteSocial}
                    {...register("tiktok")}
                  />
                </div>
              }
              button={
                <VerifyButton
                  property="tiktok"
                  verifiedAtField="tiktokVerifiedAt"
                  icon={TikTok}
                  onClick={() =>
                    startVerification("tiktok", getValues("tiktok"))
                  }
                />
              }
            />

            <FormRow
              variant={variant}
              label="YouTube"
              input={
                <div className="flex rounded-md">
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
                    onPaste={onPasteSocial}
                    {...register("youtube")}
                  />
                </div>
              }
              button={
                <VerifyButton
                  property="youtube"
                  verifiedAtField="youtubeVerifiedAt"
                  icon={YouTube}
                  onClick={() =>
                    startVerification("youtube", getValues("youtube"))
                  }
                />
              }
            />

            <FormRow
              variant={variant}
              label="X/Twitter"
              input={
                <div className="flex rounded-md">
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
                    onPaste={onPasteSocial}
                    {...register("twitter")}
                  />
                </div>
              }
              button={
                <VerifyButton
                  property="twitter"
                  verifiedAtField="twitterVerifiedAt"
                  icon={Twitter}
                  onClick={() =>
                    startVerification("twitter", getValues("twitter"))
                  }
                />
              }
            />
          </div>

          {variant === "onboarding" ? (
            <Button
              type="submit"
              text="Continue"
              className="mt-6"
              loading={isSubmitting || isSubmitSuccessful}
            />
          ) : (
            <div className="flex justify-end rounded-b-lg border-t border-neutral-200 bg-neutral-100 px-5 py-3.5">
              <Button
                type="submit"
                text="Save changes"
                className="h-8 w-fit px-2.5"
                loading={isSubmitting}
              />
            </div>
          )}
        </form>
      </FormProvider>
    </>
  );
}

function useOAuthVerification(source: "onboarding" | "settings") {
  const router = useRouter();

  return useCallback(
    async (provider: string, value?: string) => {
      if (!value) return false;

      try {
        const result = await updateOnlinePresenceAction({
          [provider]: value,
          source,
        });

        if (
          result?.data?.success &&
          result?.data?.verificationUrls?.[provider]
        ) {
          window.location.href = result.data.verificationUrls[provider];
        }

        return true;
      } catch (e) {
        toast.error("Failed to start verification");
        console.error("Failed to start verification", e);
      }

      return false;
    },
    [source, router],
  );
}

function VerifyButton({
  property,
  verifiedAtField,
  icon: Icon,
  onClick,
}: {
  property: keyof OnlinePresenceFormData;
  verifiedAtField: string;
  icon: Icon;
  onClick: () => Promise<boolean>;
}) {
  const { partner: partnerProfile } = usePartnerProfile();

  const { watch, getFieldState } = useFormContext<OnlinePresenceFormData>();

  const value = watch(property);
  const isValid = !!value && !getFieldState(property).invalid;

  const loading = !partnerProfile && isValid;

  const isVerified =
    value === partnerProfile?.[property] &&
    Boolean(partnerProfile?.[verifiedAtField]);

  const [isSaving, setIsSaving] = useState(false);

  return (
    <Button
      className={cn(
        "absolute right-1.5 top-1/2 h-7 w-fit -translate-y-1/2 px-2.5",
        isVerified && "border-green-100 bg-green-100 text-green-700",
      )}
      variant="secondary"
      text={isVerified ? "Verified" : "Verify"}
      icon={
        isVerified ? (
          <CircleCheckFill className="size-4 text-green-700" />
        ) : (
          <Icon className="size-3.5" />
        )
      }
      loading={isSaving || loading}
      disabled={!value || getFieldState(property).invalid || isVerified}
      onClick={async () => {
        setIsSaving(true);
        const redirecting = await onClick();

        if (!redirecting) setIsSaving(false);
      }}
    />
  );
}

function FormRow({
  variant,
  label,
  input,
  button,
}: {
  variant: "onboarding" | "settings";
  label: string;
  input: ReactNode;
  button: ReactNode;
}) {
  return (
    <div className={cn(variant === "settings" && "py-5")}>
      <label
        className={cn(
          "flex flex-col gap-2",
          variant === "settings" && "flex-row items-center justify-between",
        )}
      >
        <span className="text-sm font-medium text-neutral-800">{label}</span>
        <div
          className={cn(
            "relative",
            variant === "settings" && "max-w-[55%] grow",
          )}
        >
          {input}
          {button}
        </div>
      </label>
    </div>
  );
}

const onPasteSocial = (e: React.ClipboardEvent<HTMLInputElement>) => {
  e.preventDefault();

  // Extract the final portion of any URL
  const text = e.clipboardData.getData("text/plain");
  e.currentTarget.value = (text.split("/").at(-1) ?? text).replace(/^@/, "");
};
