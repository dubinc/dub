"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import { startPartnerPlatformVerificationAction } from "@/lib/actions/partners/start-partner-platform-verification";
import { updatePartnerPlatformsAction } from "@/lib/actions/partners/update-partner-platforms";
import { hasPermission } from "@/lib/auth/partner-users/partner-user-permissions";
import {
  MAX_PLATFORMS_PER_TYPE,
  PLATFORM_ORDER,
  sanitizeSocialHandle,
  sanitizeWebsite,
} from "@/lib/social-utils";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PartnerPlatformProps, PartnerProps } from "@/lib/types";
import { DomainVerificationModal } from "@/ui/modals/domain-verification-modal";
import { SocialVerificationByCodeModal } from "@/ui/modals/social-verification-by-code-modal";
import {
  Button,
  Globe,
  Icon,
  Instagram,
  LinkedIn,
  Popover,
  TikTok,
  Twitter,
  YouTube,
} from "@dub/ui";
import { getPrettyUrl, nFormatter } from "@dub/utils";
import { cn } from "@dub/utils/src/functions";
import { PlatformType } from "@prisma/client";
import { Command } from "cmdk";
import { Plus } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { forwardRef, useMemo, useState } from "react";
import {
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { PartnerPlatformCard } from "./partner-platform-card";

type PlatformInputConfig = {
  label: string;
  icon: Icon;
  domainLabel?: string;
  innerAtPrefix?: boolean;
  cardPrefix?: string;
  placeholder: string;
};

type PlatformRow = {
  type: PlatformType;
  identifier: string;
};

type PartnerPlatformsFormData = {
  platforms: PlatformRow[];
};

interface PartnerPlatformsFormProps {
  variant?: "onboarding" | "settings";
  partner?: Pick<PartnerProps, "platforms"> | null;
  onSubmitSuccessful?: () => void;
}

const PLATFORM_CONFIG: Record<PlatformType, PlatformInputConfig> = {
  website: {
    label: "Website",
    icon: Globe,
    placeholder: "example.com",
  },
  youtube: {
    label: "YouTube",
    icon: YouTube,
    domainLabel: "youtube.com",
    innerAtPrefix: true,
    cardPrefix: "@",
    placeholder: "handle",
  },
  twitter: {
    label: "X/Twitter",
    icon: Twitter,
    domainLabel: "x.com",
    cardPrefix: "@",
    placeholder: "handle",
  },
  instagram: {
    label: "Instagram",
    icon: Instagram,
    domainLabel: "instagram.com",
    cardPrefix: "@",
    placeholder: "handle",
  },
  tiktok: {
    label: "TikTok",
    icon: TikTok,
    domainLabel: "tiktok.com",
    innerAtPrefix: true,
    cardPrefix: "@",
    placeholder: "handle",
  },
  linkedin: {
    label: "LinkedIn",
    icon: LinkedIn,
    domainLabel: "linkedin.com/in",
    cardPrefix: "in/",
    placeholder: "handle",
  },
};

// Normalize a value the same way the server does, so we can match against
// stored identifiers.
function normalizeForType(type: PlatformType, value: string | undefined) {
  if (!value) {
    return null;
  }
  return type === "website"
    ? sanitizeWebsite(value)
    : sanitizeSocialHandle(value, type);
}

// Find the partner's stored platform that matches a given row value.
function findMatchingPlatform(
  platforms: PartnerPlatformProps[] | undefined,
  type: PlatformType,
  value: string | undefined,
): PartnerPlatformProps | undefined {
  const normalized = normalizeForType(type, value);
  if (!normalized) {
    return undefined;
  }

  return platforms?.find((p) => {
    if (p.type !== type) {
      return false;
    }
    if (type === "website") {
      return (
        sanitizeWebsite(p.identifier)?.toLowerCase() ===
        normalized.toLowerCase()
      );
    }
    return p.identifier.toLowerCase() === normalized.toLowerCase();
  });
}

// Build the stat lines shown on a verified card.
function getPlatformInfo(platform: PartnerPlatformProps): string[] {
  const subscribers = Number(platform.subscribers ?? 0);
  const posts = Number(platform.posts ?? 0);
  const views = Number(platform.views ?? 0);

  switch (platform.type) {
    case "website":
      return subscribers > 0 ? [`${subscribers} DR`] : [];
    case "youtube":
      return [
        subscribers > 0 ? `${nFormatter(subscribers)} subscribers` : null,
        views > 0 ? `${nFormatter(views)} views` : null,
      ].filter(Boolean) as string[];
    case "instagram":
    case "tiktok":
      return [
        subscribers > 0 ? `${nFormatter(subscribers)} followers` : null,
        posts > 0 ? `${nFormatter(posts)} posts` : null,
      ].filter(Boolean) as string[];
    case "twitter":
      return [
        subscribers > 0 ? `${nFormatter(subscribers)} followers` : null,
        posts > 0 ? `${nFormatter(posts)} tweets` : null,
      ].filter(Boolean) as string[];
    case "linkedin":
      return subscribers > 0 ? [`${nFormatter(subscribers)} followers`] : [];
    default:
      return [];
  }
}

// Seed form rows: one row per existing handle, plus one empty base row for any
// platform type the partner has no handle for (so all six are always visible).
function getDefaultPlatformRows(
  partner: PartnerPlatformsFormProps["partner"],
): PlatformRow[] {
  const platforms = partner?.platforms ?? [];
  const rows: PlatformRow[] = [];

  for (const type of PLATFORM_ORDER) {
    const handles = platforms.filter((p) => p.type === type);

    if (handles.length === 0) {
      rows.push({ type, identifier: "" });
      continue;
    }

    for (const handle of handles) {
      rows.push({
        type,
        identifier:
          type === "website"
            ? getPrettyUrl(handle.identifier)
            : handle.identifier,
      });
    }
  }

  return rows;
}

/**
 * Separate optional hook to allow for form management outside of the main component.
 * If used, the returned form object should be passed to the main component as a prop.
 */
export function usePartnerPlatformsForm({
  partner,
}: Pick<PartnerPlatformsFormProps, "partner">) {
  return useForm<PartnerPlatformsFormData>({
    defaultValues: {
      platforms: getDefaultPlatformRows(partner),
    },
  });
}

type PartnerPlatformsFormWithFormProps = PartnerPlatformsFormProps & {
  form?: ReturnType<typeof usePartnerPlatformsForm>;
};

export const PartnerPlatformsForm = forwardRef<
  HTMLFormElement,
  PartnerPlatformsFormWithFormProps
>(
  (
    {
      form: formProp,
      variant = "onboarding",
      partner,
      onSubmitSuccessful,
    }: PartnerPlatformsFormWithFormProps,
    ref,
  ) => {
    const defaultForm = usePartnerPlatformsForm({ partner });
    const form = formProp ?? defaultForm;
    const { partner: currentPartner } = usePartnerProfile();

    const disabled = currentPartner
      ? !hasPermission(currentPartner.role, "partner_profile.update")
      : true;

    const {
      control,
      getValues,
      handleSubmit,
      reset,
      formState: { isSubmitting, isSubmitSuccessful },
    } = form;

    const { fields, append, remove } = useFieldArray({
      control,
      name: "platforms",
    });

    const watchedPlatforms = useWatch({ control, name: "platforms" });

    const { executeAsync } = useAction(updatePartnerPlatformsAction, {
      onSuccess: async () => {
        toast.success(
          "Successfully updated your websites and social accounts.",
        );
        await mutate("/api/partner-profile");
      },
      onError: ({ error }) => {
        toast.error(
          parseActionError(
            error,
            "Failed to update your websites and social accounts.",
          ),
        );

        reset(form.getValues(), { keepErrors: true });
      },
    });

    const [domainVerificationData, setDomainVerificationData] = useState<{
      domain: string;
      txtRecord: string;
      identifier: string;
    } | null>(null);

    const [socialVerificationData, setSocialVerificationData] = useState<{
      platform: PlatformType;
      handle: string;
      verificationCode: string;
    } | null>(null);

    const [verifyingIndex, setVerifyingIndex] = useState<number | null>(null);

    const { executeAsync: startSocialVerification } = useAction(
      startPartnerPlatformVerificationAction,
      {
        onSuccess: async ({ input, data }) => {
          if (!input || !data) {
            return;
          }

          // For website: auto-verified when email domain matches website domain
          if (data.type === "auto_verified") {
            toast.success(
              "Website automatically verified because your email domain matches the website domain.",
            );
            await mutate("/api/partner-profile");
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
              identifier: input.handle,
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
      },
    );

    // Count how many handles of each type are currently in the form
    const countByType = useMemo(() => {
      const counts: Partial<Record<PlatformType, number>> = {};
      for (const row of watchedPlatforms ?? []) {
        counts[row.type] = (counts[row.type] ?? 0) + 1;
      }
      return counts;
    }, [watchedPlatforms]);

    const onVerifyRow = async (index: number, type: PlatformType) => {
      const handle = getValues(`platforms.${index}.identifier`);

      if (!handle) {
        return;
      }

      setVerifyingIndex(index);

      const result = await startSocialVerification({
        platform: type,
        handle,
        source: variant,
      });

      // Keep the spinner on while redirecting to an OAuth provider
      const redirecting = result?.data?.type === "oauth";
      if (!redirecting) {
        setVerifyingIndex(null);
      }
    };

    return (
      <>
        {domainVerificationData && (
          <DomainVerificationModal
            domain={domainVerificationData.domain}
            txtRecord={domainVerificationData.txtRecord}
            identifier={domainVerificationData.identifier}
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
                "flex w-full flex-col gap-4 text-left",
                variant === "onboarding" && "gap-3",
              )}
            >
              {fields.map((field, index) => (
                <PlatformFormRow
                  key={field.id}
                  index={index}
                  type={field.type}
                  variant={variant}
                  disabled={disabled}
                  isVerifying={verifyingIndex === index}
                  onVerify={() => onVerifyRow(index, field.type)}
                  onRemove={() => remove(index)}
                />
              ))}

              <AddPlatformButton
                disabled={disabled}
                countByType={countByType}
                onAdd={(type) => append({ type, identifier: "" })}
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

function AddPlatformButton({
  disabled,
  countByType,
  onAdd,
}: {
  disabled: boolean;
  countByType: Partial<Record<PlatformType, number>>;
  onAdd: (type: PlatformType) => void;
}) {
  const [openPopover, setOpenPopover] = useState(false);

  if (disabled) {
    return null;
  }

  return (
    <div>
      <Popover
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
        align="start"
        content={
          <Command tabIndex={0} loop className="pointer-events-auto">
            <Command.List className="flex w-screen flex-col gap-1 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[220px]">
              <Command.Group className="p-1.5">
                {PLATFORM_ORDER.map((type) => {
                  const config = PLATFORM_CONFIG[type];
                  const atLimit =
                    (countByType[type] ?? 0) >= MAX_PLATFORMS_PER_TYPE;

                  return (
                    <Command.Item
                      key={type}
                      disabled={atLimit}
                      className={cn(
                        "flex cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-md p-2 text-sm text-neutral-600",
                        "data-[selected=true]:bg-neutral-100",
                        atLimit && "cursor-not-allowed opacity-50",
                      )}
                      onSelect={() => {
                        if (atLimit) return;
                        onAdd(type);
                        setOpenPopover(false);
                      }}
                    >
                      <span className="text-content-emphasis shrink-0">
                        <config.icon className="size-4" />
                      </span>
                      <span className="grow">{config.label}</span>
                      {atLimit && (
                        <span className="text-content-subtle text-xs">
                          Max {MAX_PLATFORMS_PER_TYPE}
                        </span>
                      )}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            </Command.List>
          </Command>
        }
      >
        <Button
          type="button"
          variant="secondary"
          text="Add more"
          icon={<Plus className="size-4" />}
          className="h-9 w-fit px-3"
        />
      </Popover>
    </div>
  );
}

function PlatformFormRow({
  index,
  type,
  variant,
  disabled,
  isVerifying,
  onVerify,
  onRemove,
}: {
  index: number;
  type: PlatformType;
  variant: "onboarding" | "settings";
  disabled: boolean;
  isVerifying: boolean;
  onVerify: () => void;
  onRemove: () => void;
}) {
  const config = PLATFORM_CONFIG[type];
  const { partner } = usePartnerProfile();
  const { register, control, setValue } =
    useFormContext<PartnerPlatformsFormData>();

  const value = useWatch({ control, name: `platforms.${index}.identifier` });

  const matchedPlatform = findMatchingPlatform(
    (partner as typeof partner & { platforms?: PartnerPlatformProps[] })
      ?.platforms,
    type,
    value,
  );
  const isVerified = Boolean(matchedPlatform?.verifiedAt);
  const info = matchedPlatform ? getPlatformInfo(matchedPlatform) : undefined;

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text/plain");
    const sanitized =
      type === "website"
        ? sanitizeWebsite(text)
        : sanitizeSocialHandle(text, type);

    if (sanitized) {
      setValue(`platforms.${index}.identifier`, sanitized);
      e.preventDefault();
    }
  };

  if (isVerified) {
    return (
      <div className="flex flex-col gap-1.5">
        {variant === "onboarding" && (
          <span className="text-content-emphasis text-sm font-medium">
            {config.label}
          </span>
        )}
        <PartnerPlatformCard
          icon={config.icon}
          prefix={config.cardPrefix}
          value={value ?? ""}
          verified
          info={info && info.length > 0 ? info : undefined}
          onRemove={disabled ? undefined : onRemove}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {variant === "onboarding" && (
        <span className="text-content-emphasis text-sm font-medium">
          {config.label}
        </span>
      )}
      <div className="relative">
        {config.domainLabel ? (
          <div className="flex rounded-md">
            <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
              {config.domainLabel}
            </span>
            <div className="relative w-full">
              {config.innerAtPrefix && (
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-neutral-400">
                  @
                </span>
              )}
              <input
                type="text"
                disabled={disabled}
                className={cn(
                  "block w-full rounded-none rounded-r-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  config.innerAtPrefix && "pl-7",
                  disabled &&
                    "cursor-not-allowed bg-neutral-50 text-neutral-400",
                )}
                placeholder={config.placeholder}
                onPaste={onPaste}
                {...register(`platforms.${index}.identifier`)}
              />
            </div>
          </div>
        ) : (
          <input
            type="text"
            disabled={disabled}
            className={cn(
              "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
              disabled && "cursor-not-allowed bg-neutral-50 text-neutral-400",
            )}
            placeholder={config.placeholder}
            onPaste={onPaste}
            {...register(`platforms.${index}.identifier`)}
          />
        )}

        <Button
          type="button"
          variant="secondary"
          text="Verify"
          icon={<config.icon className="size-3.5" />}
          className="absolute right-1.5 top-1/2 h-7 w-fit -translate-y-1/2 px-2.5"
          loading={isVerifying}
          disabled={disabled || !value}
          onClick={onVerify}
        />
      </div>
    </div>
  );
}
