"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import { startPartnerPlatformVerificationAction } from "@/lib/actions/partners/start-partner-platform-verification";
import { updateOnlinePresenceAction } from "@/lib/actions/partners/update-online-presence";
import { hasPermission } from "@/lib/auth/partner-users/partner-user-permissions";
import { sanitizeSocialHandle, sanitizeWebsite } from "@/lib/social-utils";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PartnerPlatformProps, PartnerProps } from "@/lib/types";
import { parseUrlSchemaAllowEmpty } from "@/lib/zod/schemas/utils";
import { DomainVerificationModal } from "@/ui/modals/domain-verification-modal";
import { SocialVerificationByCodeModal } from "@/ui/modals/social-verification-by-code-modal";
import { PlatformType } from "@dub/prisma/client";
import {
  AnimatedSizeContainer,
  Button,
  CircleCheckFill,
  Globe,
  Icon,
  Instagram,
  LinkedIn,
  TikTok,
  Twitter,
  YouTube,
} from "@dub/ui";
import { getPrettyUrl, nFormatter } from "@dub/utils";
import { cn } from "@dub/utils/src/functions";
import { useAction } from "next-safe-action/hooks";
import { forwardRef, ReactNode, useCallback, useMemo, useState } from "react";
import {
  FormProvider,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import * as z from "zod/v4";
import { OnlinePresenceCard } from "./online-presence-card";

const onlinePresenceSchema = z.object({
  website: parseUrlSchemaAllowEmpty().nullish(),
  youtube: z.string().nullish(),
  twitter: z.string().nullish(),
  linkedin: z.string().nullish(),
  instagram: z.string().nullish(),
  tiktok: z.string().nullish(),
});

type OnlinePresenceFormData = z.infer<typeof onlinePresenceSchema>;

interface OnlinePresenceFormProps {
  variant?: "onboarding" | "settings";
  partner?: Pick<PartnerProps, "platforms"> | null;
  onSubmitSuccessful?: () => void;
}

// Helper function to get platform data from platforms array
function getPlatformData(
  platforms: PartnerPlatformProps[] | undefined,
  platform: PlatformType,
): PartnerPlatformProps | undefined {
  return platforms?.find((p) => p.type === platform);
}

// Helper function to get identifier from platforms array
function getPlatformIdentifier(
  partner: OnlinePresenceFormProps["partner"],
  platform: PlatformType,
): string | undefined {
  return getPlatformData(partner?.platforms, platform)?.identifier;
}

/**
 * Separate optional hook to allow for form management outside of the main component.
 * If used, the returned form object should be passed to the main component as a prop.
 */
export function useOnlinePresenceForm({
  partner,
}: Pick<OnlinePresenceFormProps, "partner">) {
  return useForm<OnlinePresenceFormData>({
    defaultValues: {
      website: getPlatformIdentifier(partner, "website")
        ? getPrettyUrl(getPlatformIdentifier(partner, "website")!)
        : undefined,
      youtube: getPlatformIdentifier(partner, "youtube") || undefined,
      twitter: getPlatformIdentifier(partner, "twitter") || undefined,
      linkedin: getPlatformIdentifier(partner, "linkedin") || undefined,
      instagram: getPlatformIdentifier(partner, "instagram") || undefined,
      tiktok: getPlatformIdentifier(partner, "tiktok") || undefined,
    },
  });
}

type OnlinePresenceFormWithFormProps = OnlinePresenceFormProps & {
  form?: ReturnType<typeof useOnlinePresenceForm>;
};

export const OnlinePresenceForm = forwardRef<
  HTMLFormElement,
  OnlinePresenceFormWithFormProps
>(
  (
    {
      form: formProp,
      variant = "onboarding",
      partner,
      onSubmitSuccessful,
    }: OnlinePresenceFormWithFormProps,
    ref,
  ) => {
    const form = formProp ?? useOnlinePresenceForm({ partner });
    const { partner: currentPartner } = usePartnerProfile();

    const disabled = currentPartner
      ? !hasPermission(currentPartner.role, "partner_profile.update")
      : true;

    const {
      register,
      getValues,
      handleSubmit,
      reset,
      setValue,
      formState: { errors, isSubmitting, isSubmitSuccessful },
    } = form;

    const { executeAsync } = useAction(updateOnlinePresenceAction, {
      onSuccess: async () => {
        await mutate("/api/partner-profile");
      },
      onError: ({ error }) => {
        toast.error(
          parseActionError(error, "Failed to update online presence"),
        );

        reset(form.getValues(), { keepErrors: true });
      },
    });

    const [domainVerificationData, setDomainVerificationData] = useState<{
      domain: string;
      txtRecord: string;
    } | null>(null);

    const [socialVerificationData, setSocialVerificationData] = useState<{
      platform: PlatformType;
      handle: string;
      verificationCode: string;
    } | null>(null);

    const {
      executeAsync: startSocialVerification,
      isPending: isStartingSocialVerification,
    } = useAction(startPartnerPlatformVerificationAction, {
      onSuccess: ({ input, data }) => {
        if (!input || !data) {
          return;
        }

        // For website verification (TXT record)
        if (data.type === "txt_record") {
          const websiteUrl = input.handle.startsWith("http")
            ? input.handle
            : `https://${input.handle}`;

          setDomainVerificationData({
            domain: new URL(websiteUrl).hostname,
            txtRecord: data.websiteTxtRecord,
          });
        }

        // For OAuth flow
        else if (data.type === "oauth") {
          window.location.href = data.oauthUrl;
        }

        // For verification code flow
        else if (data.type === "verification_code") {
          setSocialVerificationData({
            platform: input.platform,
            handle: input.handle,
            verificationCode: data.verificationCode,
          });
        }
      },
      onError: ({ error }) => {
        toast.error(parseActionError(error, "Failed to start verification."));
      },
    });

    const onPasteWebsite = useCallback(
      (e: React.ClipboardEvent<HTMLInputElement>) => {
        const text = e.clipboardData.getData("text/plain");
        const sanitized = sanitizeWebsite(text);

        if (sanitized) {
          setValue("website", sanitized);
          e.preventDefault();
        }
      },
      [setValue],
    );

    const onPasteSocial = useCallback(
      (e: React.ClipboardEvent<HTMLInputElement>, platform: PlatformType) => {
        const text = e.clipboardData.getData("text/plain");
        const sanitized = sanitizeSocialHandle(text, platform);

        if (sanitized) {
          setValue(platform, sanitized);
          e.preventDefault();
        }
      },
      [setValue],
    );

    return (
      <>
        {domainVerificationData && (
          <DomainVerificationModal
            domain={domainVerificationData.domain}
            txtRecord={domainVerificationData.txtRecord}
            showDomainVerificationModal={domainVerificationData !== null}
            setShowDomainVerificationModal={() =>
              setDomainVerificationData(null)
            }
          />
        )}

        {socialVerificationData && (
          <SocialVerificationByCodeModal
            platform={socialVerificationData.platform}
            handle={socialVerificationData.handle}
            verificationCode={socialVerificationData.verificationCode}
            showSocialVerificationModal={socialVerificationData !== null}
            setShowSocialVerificationModal={(show) => {
              if (!show) setSocialVerificationData(null);
            }}
          />
        )}

        <FormProvider {...form}>
          <form
            ref={ref}
            onSubmit={handleSubmit(async (data) => {
              const result = await executeAsync(data);
              if (result) onSubmitSuccessful?.();
            })}
          >
            <div
              className={cn(
                "flex w-full flex-col gap-6 text-left",
                variant === "settings" && "gap-4",
              )}
            >
              <FormRow
                label="Website"
                property="website"
                icon={Globe}
                disabled={disabled}
                onVerifyClick={async () => {
                  const website = getValues("website");

                  if (website) {
                    await startSocialVerification({
                      platform: "website",
                      handle: website,
                      source: variant,
                    });
                  }

                  return isStartingSocialVerification;
                }}
                input={
                  <input
                    type="text"
                    disabled={disabled}
                    className={cn(
                      "block w-full rounded-md focus:outline-none sm:text-sm",
                      disabled &&
                        "cursor-not-allowed bg-neutral-50 text-neutral-400",
                      errors.website
                        ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
                    )}
                    placeholder="example.com"
                    onPaste={onPasteWebsite}
                    {...register("website")}
                  />
                }
                variant={variant}
              />

              <FormRow
                label="YouTube"
                property="youtube"
                prefix="@"
                icon={YouTube}
                disabled={disabled}
                onVerifyClick={async () => {
                  const handle = getValues("youtube");

                  if (handle) {
                    await startSocialVerification({
                      platform: "youtube",
                      handle,
                      source: variant,
                    });
                  }

                  return isStartingSocialVerification;
                }}
                input={
                  <div className="flex rounded-md">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
                      youtube.com
                    </span>
                    <span className="absolute inset-y-0 left-[6.7rem] flex items-center pl-3 text-sm text-neutral-400">
                      @
                    </span>
                    <input
                      type="text"
                      disabled={disabled}
                      className={cn(
                        "block w-full rounded-none rounded-r-md pl-7 focus:outline-none sm:text-sm",
                        disabled &&
                          "cursor-not-allowed bg-neutral-50 text-neutral-400",
                        errors.youtube
                          ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                          : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
                      )}
                      placeholder="handle"
                      onPaste={(e) => onPasteSocial(e, "youtube")}
                      {...register("youtube")}
                    />
                  </div>
                }
                variant={variant}
              />

              <FormRow
                label="X/Twitter"
                property="twitter"
                prefix="@"
                icon={Twitter}
                disabled={disabled}
                onVerifyClick={async () => {
                  const handle = getValues("twitter");

                  if (handle) {
                    await startSocialVerification({
                      platform: "twitter",
                      handle,
                      source: variant,
                    });
                  }

                  return isStartingSocialVerification;
                }}
                input={
                  <div className="flex rounded-md">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
                      x.com
                    </span>
                    <input
                      type="text"
                      disabled={disabled}
                      className={cn(
                        "block w-full rounded-none rounded-r-md focus:outline-none sm:text-sm",
                        disabled &&
                          "cursor-not-allowed bg-neutral-50 text-neutral-400",
                        errors.twitter
                          ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                          : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
                      )}
                      placeholder="handle"
                      onPaste={(e) => onPasteSocial(e, "twitter")}
                      {...register("twitter")}
                    />
                  </div>
                }
                variant={variant}
              />

              <FormRow
                label="LinkedIn"
                property="linkedin"
                prefix="in/"
                icon={LinkedIn}
                disabled={disabled}
                verifyDisabledTooltip="LinkedIn verification is coming soon."
                onVerifyClick={async () => {
                  const handle = getValues("linkedin");

                  if (handle) {
                    await startSocialVerification({
                      platform: "linkedin",
                      handle,
                      source: variant,
                    });
                  }

                  return isStartingSocialVerification;
                }}
                input={
                  <div className="flex rounded-md">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
                      linkedin.com/in
                    </span>
                    <input
                      type="text"
                      disabled={disabled}
                      className={cn(
                        "block w-full rounded-none rounded-r-md focus:outline-none sm:text-sm",
                        disabled &&
                          "cursor-not-allowed bg-neutral-50 text-neutral-400",
                        errors.linkedin
                          ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                          : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
                      )}
                      placeholder="handle"
                      onPaste={(e) => onPasteSocial(e, "linkedin")}
                      {...register("linkedin")}
                    />
                  </div>
                }
                variant={variant}
              />

              <FormRow
                label="Instagram"
                property="instagram"
                prefix="@"
                icon={Instagram}
                disabled={disabled}
                onVerifyClick={async () => {
                  const handle = getValues("instagram");

                  if (handle) {
                    await startSocialVerification({
                      platform: "instagram",
                      handle,
                      source: variant,
                    });
                  }

                  return isStartingSocialVerification;
                }}
                input={
                  <div className="flex rounded-md">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
                      instagram.com
                    </span>
                    <input
                      type="text"
                      disabled={disabled}
                      className={cn(
                        "block w-full rounded-none rounded-r-md focus:outline-none sm:text-sm",
                        disabled &&
                          "cursor-not-allowed bg-neutral-50 text-neutral-400",
                        errors.instagram
                          ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                          : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
                      )}
                      placeholder="handle"
                      onPaste={(e) => onPasteSocial(e, "instagram")}
                      {...register("instagram")}
                    />
                  </div>
                }
                variant={variant}
              />

              <FormRow
                label="TikTok"
                property="tiktok"
                prefix="@"
                icon={TikTok}
                disabled={disabled}
                onVerifyClick={async () => {
                  const handle = getValues("tiktok");

                  if (handle) {
                    await startSocialVerification({
                      platform: "tiktok",
                      handle,
                      source: variant,
                    });
                  }

                  return isStartingSocialVerification;
                }}
                input={
                  <div className="flex rounded-md">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
                      tiktok.com
                    </span>
                    <span className="absolute inset-y-0 left-[5.7rem] flex items-center pl-3 text-sm text-neutral-400">
                      @
                    </span>
                    <input
                      type="text"
                      disabled={disabled}
                      className={cn(
                        "block w-full rounded-none rounded-r-md pl-7 focus:outline-none sm:text-sm",
                        disabled &&
                          "cursor-not-allowed bg-neutral-50 text-neutral-400",
                        errors.tiktok
                          ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                          : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
                      )}
                      placeholder="handle"
                      onPaste={(e) => onPasteSocial(e, "tiktok")}
                      {...register("tiktok")}
                    />
                  </div>
                }
                variant={variant}
              />
            </div>

            {variant === "onboarding" && (
              <Button
                type="submit"
                text="Continue"
                className="mt-6"
                disabled={disabled}
                loading={isSubmitting || isSubmitSuccessful}
              />
            )}
          </form>
        </FormProvider>
      </>
    );
  },
);

function useVerifiedState({
  property,
}: {
  property: keyof OnlinePresenceFormData;
}) {
  const { partner: partnerProfile } = usePartnerProfile();

  const { watch, getFieldState } = useFormContext<OnlinePresenceFormData>();

  const value = watch(property);
  const isValid = !!value && !getFieldState(property).invalid;

  const loading = !partnerProfile && isValid;

  // Map form property to PlatformType enum
  const platformMap: Record<keyof OnlinePresenceFormData, PlatformType> = {
    website: "website",
    youtube: "youtube",
    twitter: "twitter",
    linkedin: "linkedin",
    instagram: "instagram",
    tiktok: "tiktok",
  };

  const platform = platformMap[property];
  const currentHandle = getPlatformIdentifier(partnerProfile, platform);

  const noChange =
    property === "website"
      ? getPrettyUrl(currentHandle ?? "") === getPrettyUrl(value ?? "")
      : currentHandle === value;

  const platformData = getPlatformData(partnerProfile?.platforms, platform);
  const isVerified = noChange && Boolean(platformData?.verifiedAt);

  return {
    isVerified,
    loading,
  };
}

function VerifyButton({
  property,
  icon: Icon,
  onClick,
  disabledTooltip,
  disabled: formDisabled = false,
}: {
  property: keyof OnlinePresenceFormData;
  icon: Icon;
  onClick: () => Promise<boolean>;
  disabledTooltip?: string;
  disabled?: boolean;
}) {
  const { control, getFieldState } = useFormContext<OnlinePresenceFormData>();
  const value = useWatch({ control, name: property });

  const { isVerified, loading } = useVerifiedState({
    property,
  });

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
      disabled={
        formDisabled || !value || getFieldState(property).invalid || isVerified
      }
      onClick={async () => {
        if (formDisabled) return;
        setIsSaving(true);
        const redirecting = await onClick();

        if (!redirecting) setIsSaving(false);
      }}
      {...(disabledTooltip && {
        disabledTooltip,
      })}
    />
  );
}

function FormRow({
  label,
  input,
  property,
  prefix,
  icon: Icon,
  onVerifyClick,
  verifyDisabledTooltip,
  variant,
  disabled = false,
}: {
  label: string;
  input: ReactNode;

  property: keyof OnlinePresenceFormData;
  prefix?: string;
  icon: Icon;
  onVerifyClick: () => Promise<boolean>;
  verifyDisabledTooltip?: string;
  variant: "onboarding" | "settings";
  disabled?: boolean;
}) {
  const { partner } = usePartnerProfile();
  const { control, setValue } = useFormContext<OnlinePresenceFormData>();
  const value = useWatch({ control, name: property });

  const { isVerified } = useVerifiedState({ property });

  const info = useMemo(() => {
    if (partner && isVerified) {
      // Type assertion for platforms array that exists at runtime but not in type
      const partnerWithPlatforms = partner as typeof partner & {
        platforms?: PartnerPlatformProps[];
      };

      if (property === "youtube") {
        const youtubePlatform = getPlatformData(
          partnerWithPlatforms.platforms,
          "youtube",
        );
        const subscribers = youtubePlatform?.subscribers ?? 0;
        const views = youtubePlatform?.views ?? 0;

        return [
          subscribers > 0
            ? `${nFormatter(Number(subscribers))} subscribers`
            : null,
          views > 0 ? `${nFormatter(Number(views))} views` : null,
        ].filter(Boolean) as string[];
      }

      if (property === "instagram") {
        const instagramPlatform = getPlatformData(
          partnerWithPlatforms.platforms,
          "instagram",
        );
        const subscribers = instagramPlatform?.subscribers ?? 0;
        const posts = instagramPlatform?.posts ?? 0;

        return [
          subscribers > 0
            ? `${nFormatter(Number(subscribers))} followers`
            : null,
          posts > 0 ? `${nFormatter(Number(posts))} posts` : null,
        ].filter(Boolean) as string[];
      }

      if (property === "tiktok") {
        const tiktokPlatform = getPlatformData(
          partnerWithPlatforms.platforms,
          "tiktok",
        );
        const subscribers = tiktokPlatform?.subscribers ?? 0;
        const posts = tiktokPlatform?.posts ?? 0;

        return [
          subscribers > 0
            ? `${nFormatter(Number(subscribers))} followers`
            : null,
          posts > 0 ? `${nFormatter(Number(posts))} posts` : null,
        ].filter(Boolean) as string[];
      }

      if (property === "twitter") {
        const twitterPlatform = getPlatformData(
          partnerWithPlatforms.platforms,
          "twitter",
        );
        const subscribers = twitterPlatform?.subscribers ?? 0;
        const posts = twitterPlatform?.posts ?? 0;

        return [
          subscribers > 0
            ? `${nFormatter(Number(subscribers))} followers`
            : null,
          posts > 0 ? `${nFormatter(Number(posts))} tweets` : null,
        ].filter(Boolean) as string[];
      }
    }
    return null;
  }, [partner, property, isVerified]);

  return (
    <div className="-m-0.5">
      <AnimatedSizeContainer
        height
        initial={false}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        <div className="p-0.5">
          {isVerified ? (
            <div className="flex flex-col gap-1.5">
              <span
                className={cn(
                  "text-content-emphasis text-sm font-medium",
                  variant === "settings" && "sr-only",
                )}
              >
                {label}
              </span>
              <OnlinePresenceCard
                icon={Icon}
                prefix={prefix}
                value={value ?? ""}
                verified
                info={info ?? undefined}
                onRemove={() => setValue(property, null, { shouldDirty: true })}
              />
            </div>
          ) : (
            <label className={cn("flex flex-col gap-1.5")}>
              <span
                className={cn(
                  "text-content-emphasis text-sm font-medium",
                  variant === "settings" && "sr-only",
                )}
              >
                {label}
              </span>
              <div className={cn("relative")}>
                {input}
                <VerifyButton
                  property={property}
                  icon={Icon}
                  onClick={onVerifyClick}
                  disabledTooltip={verifyDisabledTooltip}
                  disabled={disabled}
                />
              </div>
            </label>
          )}
        </div>
      </AnimatedSizeContainer>
    </div>
  );
}
