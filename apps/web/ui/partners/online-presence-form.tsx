"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import { updateOnlinePresenceAction } from "@/lib/actions/partners/update-online-presence";
import {
  sanitizeSocialHandle,
  sanitizeWebsite,
  SocialPlatform,
} from "@/lib/social-utils";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { parseUrlSchemaAllowEmpty } from "@/lib/zod/schemas/utils";
import { DomainVerificationModal } from "@/ui/modals/domain-verification-modal";
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
import { useRouter } from "next/navigation";
import { forwardRef, ReactNode, useCallback, useMemo, useState } from "react";
import {
  FormProvider,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { z } from "zod";
import { OnlinePresenceCard } from "./online-presence-card";

const onlinePresenceSchema = z.object({
  website: parseUrlSchemaAllowEmpty().optional(),
  youtube: z.string().optional(),
  twitter: z.string().optional(),
  linkedin: z.string().optional(),
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
});

type OnlinePresenceFormData = z.infer<typeof onlinePresenceSchema>;

interface OnlinePresenceFormProps {
  variant?: "onboarding" | "settings";
  partner?: {
    email: string | null;
    website: string | null;
    youtube: string | null;
    twitter: string | null;
    linkedin: string | null;
    instagram: string | null;
    tiktok: string | null;
  } | null;
  onSubmitSuccessful?: () => void;
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
      website: partner?.website ? getPrettyUrl(partner.website) : undefined,
      youtube: partner?.youtube || undefined,
      twitter: partner?.twitter || undefined,
      linkedin: partner?.linkedin || undefined,
      instagram: partner?.instagram || undefined,
      tiktok: partner?.tiktok || undefined,
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

    const {
      register,
      setError,
      getValues,
      handleSubmit,
      reset,
      setValue,
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

    const startVerification = useOAuthVerification(variant);

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
      (e: React.ClipboardEvent<HTMLInputElement>, platform: SocialPlatform) => {
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
        <DomainVerificationModal
          showDomainVerificationModal={domainVerificationData !== null}
          setShowDomainVerificationModal={() => setDomainVerificationData(null)}
          domain={domainVerificationData?.domain || ""}
          txtRecord={domainVerificationData?.txtRecord || ""}
        />
        <FormProvider {...form}>
          <form
            ref={ref}
            onSubmit={handleSubmit(async (data) => {
              const result = await executeAsync(data);

              if (result?.data?.success) onSubmitSuccessful?.();
            })}
          >
            <div className={cn("flex w-full flex-col gap-6 text-left")}>
              <FormRow
                label="Website"
                property="website"
                verifiedAtField="websiteVerifiedAt"
                icon={Globe}
                onVerifyClick={async () => {
                  try {
                    const result =
                      await updateOnlinePresenceAction(getValues());

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
                input={
                  <input
                    type="text"
                    className={cn(
                      "block w-full rounded-md focus:outline-none sm:text-sm",
                      errors.website
                        ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500",
                    )}
                    placeholder="example.com"
                    onPaste={onPasteWebsite}
                    {...register("website")}
                  />
                }
              />

              <FormRow
                label="YouTube"
                property="youtube"
                prefix="@"
                verifiedAtField="youtubeVerifiedAt"
                icon={YouTube}
                onVerifyClick={() =>
                  startVerification("youtube", getValues("youtube"))
                }
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
                      className={cn(
                        "block w-full rounded-none rounded-r-md pl-7 focus:outline-none sm:text-sm",
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
              />

              <FormRow
                label="X/Twitter"
                property="twitter"
                prefix="@"
                verifiedAtField="twitterVerifiedAt"
                icon={Twitter}
                onVerifyClick={() =>
                  startVerification("twitter", getValues("twitter"))
                }
                input={
                  <div className="flex rounded-md">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
                      x.com
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
                      onPaste={(e) => onPasteSocial(e, "twitter")}
                      {...register("twitter")}
                    />
                  </div>
                }
              />

              <FormRow
                label="LinkedIn"
                property="linkedin"
                prefix="in/"
                verifiedAtField="linkedinVerifiedAt"
                icon={LinkedIn}
                onVerifyClick={() =>
                  startVerification("linkedin", getValues("linkedin"))
                }
                verifyDisabledTooltip="LinkedIn verification is coming soon."
                input={
                  <div className="flex rounded-md">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
                      linkedin.com/in
                    </span>
                    <input
                      type="text"
                      className={cn(
                        "block w-full rounded-none rounded-r-md focus:outline-none sm:text-sm",
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
              />

              <FormRow
                label="Instagram"
                property="instagram"
                prefix="@"
                verifiedAtField="instagramVerifiedAt"
                icon={Instagram}
                onVerifyClick={() =>
                  startVerification("instagram", getValues("instagram"))
                }
                verifyDisabledTooltip="Instagram verification is coming soon."
                input={
                  <div className="flex rounded-md">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
                      instagram.com
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
                      onPaste={(e) => onPasteSocial(e, "instagram")}
                      {...register("instagram")}
                    />
                  </div>
                }
              />

              <FormRow
                label="TikTok"
                property="tiktok"
                prefix="@"
                verifiedAtField="tiktokVerifiedAt"
                icon={TikTok}
                onVerifyClick={() =>
                  startVerification("tiktok", getValues("tiktok"))
                }
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
                      className={cn(
                        "block w-full rounded-none rounded-r-md pl-7 focus:outline-none sm:text-sm",
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
              />
            </div>

            {variant === "onboarding" && (
              <Button
                type="submit"
                text="Continue"
                className="mt-6"
                loading={isSubmitting || isSubmitSuccessful}
              />
            )}
          </form>
        </FormProvider>
      </>
    );
  },
);

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

function useVerifiedState({
  property,
  verifiedAtField,
}: {
  property: keyof OnlinePresenceFormData;
  verifiedAtField: string;
}) {
  const { partner: partnerProfile } = usePartnerProfile();

  const { watch, getFieldState } = useFormContext<OnlinePresenceFormData>();

  const value = watch(property);
  const isValid = !!value && !getFieldState(property).invalid;

  const loading = !partnerProfile && isValid;

  const noChange =
    property === "website"
      ? getPrettyUrl(partnerProfile?.[property] ?? "") === getPrettyUrl(value)
      : partnerProfile?.[property] === value;

  const isVerified = noChange && Boolean(partnerProfile?.[verifiedAtField]);

  return {
    isVerified,
    loading,
  };
}

function VerifyButton({
  property,
  verifiedAtField,
  icon: Icon,
  onClick,
  disabledTooltip,
}: {
  property: keyof OnlinePresenceFormData;
  verifiedAtField: string;
  icon: Icon;
  onClick: () => Promise<boolean>;
  disabledTooltip?: string;
}) {
  const { control, getFieldState } = useFormContext<OnlinePresenceFormData>();
  const value = useWatch({ control, name: property });

  const { isVerified, loading } = useVerifiedState({
    property,
    verifiedAtField,
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
      disabled={!value || getFieldState(property).invalid || isVerified}
      onClick={async () => {
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
  verifiedAtField,
  icon: Icon,
  onVerifyClick,
  verifyDisabledTooltip,
}: {
  label: string;
  input: ReactNode;

  property: keyof OnlinePresenceFormData;
  prefix?: string;
  verifiedAtField: string;
  icon: Icon;
  onVerifyClick: () => Promise<boolean>;
  verifyDisabledTooltip?: string;
}) {
  const { partner } = usePartnerProfile();
  const { control, setValue } = useFormContext<OnlinePresenceFormData>();
  const value = useWatch({ control, name: property });

  const { isVerified } = useVerifiedState({ property, verifiedAtField });

  const info = useMemo(() => {
    if (partner && property === "youtube" && isVerified) {
      return [
        partner.youtubeSubscriberCount > 0
          ? `${nFormatter(partner.youtubeSubscriberCount)} subscribers`
          : null,
        partner.youtubeViewCount > 0
          ? `${nFormatter(partner.youtubeViewCount)} views`
          : null,
      ].filter(Boolean) as string[];
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
              <span className="text-content-emphasis text-sm font-medium">
                {label}
              </span>
              <OnlinePresenceCard
                icon={Icon}
                prefix={prefix}
                value={value ?? ""}
                verified
                info={info ?? undefined}
                onRemove={() => setValue(property, "", { shouldDirty: true })}
              />
            </div>
          ) : (
            <label className={cn("flex flex-col gap-1.5")}>
              <span className="text-content-emphasis text-sm font-medium">
                {label}
              </span>
              <div className={cn("relative")}>
                {input}
                <VerifyButton
                  property={property}
                  verifiedAtField={verifiedAtField}
                  icon={Icon}
                  onClick={onVerifyClick}
                  disabledTooltip={verifyDisabledTooltip}
                />
              </div>
            </label>
          )}
        </div>
      </AnimatedSizeContainer>
    </div>
  );
}
