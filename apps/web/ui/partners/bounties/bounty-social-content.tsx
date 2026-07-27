"use client";

import {
  BOUNTY_SOCIAL_PLATFORMS,
  getPlatformFromSocialUrl,
} from "@/lib/bounty/social-content";
import {
  formatSocialPlatformsList,
  resolveBountyDetails,
} from "@/lib/bounty/utils";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import {
  PartnerBountyProps,
  PartnerPlatformProps,
  SocialContent,
} from "@/lib/types";
import { useClaimBountyContext } from "@/ui/partners/bounties/claim-bounty-context";
import { useClaimBountyForm } from "@/ui/partners/bounties/use-claim-bounty-form";
import { useSocialContent } from "@/ui/partners/bounties/use-social-content";
import { Button, CircleCheck, LoadingSpinner } from "@dub/ui";
import { cn, formatDate } from "@dub/utils";
import { useReferralsEmbedData } from "app/(ee)/app.dub.co/embed/referrals/page-client";
import { AlertTriangle } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { evaluateSocialContentRequirements } from "./evaluate-social-content-requirements";

type SocialPlatformOption = (typeof BOUNTY_SOCIAL_PLATFORMS)[number];

function SocialContentRequirementChecks({
  content,
  bounty,
  partnerPlatform,
}: {
  content: SocialContent | null;
  bounty: PartnerBountyProps;
  partnerPlatform?: Pick<PartnerPlatformProps, "identifier" | "verifiedAt">;
}) {
  const { isPostedFromYourAccount, isAfterStartDate } =
    evaluateSocialContentRequirements({
      content,
      bounty,
      partnerPlatform,
    });

  return (
    <ul className="mt-2 flex flex-wrap items-center gap-3">
      <li
        className={cn(
          "flex items-center gap-1 text-xs font-medium transition-colors",
          isPostedFromYourAccount ? "text-green-600" : "text-neutral-400",
        )}
      >
        <CircleCheck
          variant="fill"
          className={cn(
            "size-2.5 transition-opacity",
            isPostedFromYourAccount ? "text-green-600" : "text-neutral-200",
          )}
        />
        <span>Posted from your account</span>
      </li>

      <li
        className={cn(
          "flex items-center gap-1 text-xs font-medium transition-colors",
          isAfterStartDate ? "text-green-600" : "text-neutral-400",
        )}
      >
        <CircleCheck
          variant="fill"
          className={cn(
            "size-2.5 transition-opacity",
            isAfterStartDate ? "text-green-600" : "text-neutral-200",
          )}
        />
        <span>{`Posted after ${formatDate(bounty.startsAt, { month: "short", day: "numeric", year: "numeric" })}`}</span>
      </li>
    </ul>
  );
}

/**
 * A single social content URL field.
 *
 * - `slot` is the index into the submission's `urls` array reserved for this field.
 * - `platforms` is the set of platforms this field accepts. A single-element array locks
 *   the field to one platform (used for legacy single-platform bounties and for each field
 *   in an AND bounty); a multi-element array means any one of them is accepted (OR bounty).
 */
export function SocialContentUrlField({
  bounty,
  slot,
  platforms,
}: {
  bounty: PartnerBountyProps;
  slot: number;
  platforms: SocialPlatformOption[];
}) {
  const { partner } = usePartnerProfile();
  const { setSocialContentVerifying, setSocialContentRequirementsMet } =
    useClaimBountyContext();

  const { watch, setValue, getValues } = useClaimBountyForm();

  const [urlToCheck, setUrlToCheck] = useState<string>("");
  const inputId = useId();

  const contentUrl = watch("urls")?.[slot] ?? "";

  useEffect(() => {
    if (contentUrl === "") {
      setUrlToCheck("");
    }
  }, [contentUrl]);

  const { data, error, isValidating } = useSocialContent({
    bountyId: bounty.id,
    url: urlToCheck,
  });

  useEffect(() => {
    setSocialContentVerifying(slot, isValidating);
    return () => setSocialContentVerifying(slot, false);
  }, [isValidating, slot, setSocialContentVerifying]);

  const detectedPlatform = getPlatformFromSocialUrl(contentUrl);
  const matchedPlatform =
    platforms.find((p) => p.value === detectedPlatform) ?? platforms[0];

  const partnerPlatform = partner?.platforms?.find(
    (p) => p.type === (detectedPlatform ?? matchedPlatform?.value),
  );

  useEffect(() => {
    const checks = evaluateSocialContentRequirements({
      content: data,
      bounty,
      partnerPlatform,
    });

    setSocialContentRequirementsMet(
      slot,
      checks.isPostedFromYourAccount && checks.isAfterStartDate,
    );

    return () => setSocialContentRequirementsMet(slot, true);
  }, [data, bounty, partnerPlatform, slot, setSocialContentRequirementsMet]);

  const showIcon = isValidating || (error && urlToCheck);

  if (platforms.length === 0 || !matchedPlatform) {
    return null;
  }

  const isSinglePlatform = platforms.length === 1;
  const label = isSinglePlatform
    ? `${matchedPlatform.label} URL`
    : `${formatSocialPlatformsList(platforms, "OR")} URL`;

  const handleChange = (value: string) => {
    const prev = getValues("urls") ?? [];
    const next =
      prev.length > slot
        ? [...prev]
        : [...prev, ...Array(slot - prev.length + 1).fill("")];
    next[slot] = value;
    setValue("urls", next, { shouldDirty: true });
  };

  const handleBlur = () => {
    const trimmed = contentUrl.trim();
    handleChange(trimmed);
    setUrlToCheck(trimmed);
  };

  return (
    <div>
      <label htmlFor={inputId} className="block">
        <span className="text-sm font-medium text-neutral-900">{label}</span>
      </label>
      <div className="relative mt-2">
        <input
          id={inputId}
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder={matchedPlatform.placeholder}
          value={contentUrl}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          className={cn(
            "block h-10 w-full rounded-md border-neutral-300 px-3 py-2 pr-10 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
            error &&
              urlToCheck &&
              "border-red-500 focus:border-red-500 focus:ring-red-500",
          )}
        />

        {showIcon && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            {isValidating ? (
              <LoadingSpinner className="size-4 shrink-0 text-neutral-400" />
            ) : error && urlToCheck ? (
              <AlertTriangle
                className="size-4 shrink-0 text-red-500"
                fill="#ef4444"
              />
            ) : null}
          </div>
        )}
      </div>
      <SocialContentRequirementChecks
        content={data}
        bounty={bounty}
        partnerPlatform={partnerPlatform}
      />
    </div>
  );
}

/**
 * Renders the social content URL field(s) for a bounty: a single field that accepts any
 * of the allowed platforms for OR bounties, or one field per required platform for AND
 * bounties.
 */
export function SocialContentUrlFields({
  bounty,
}: {
  bounty: PartnerBountyProps;
}) {
  const bountyInfo = resolveBountyDetails(bounty);
  const platforms = bountyInfo?.socialPlatforms ?? [];

  if (platforms.length === 0) {
    return null;
  }

  if (!bountyInfo?.isAndSocialMetrics) {
    return (
      <SocialContentUrlField bounty={bounty} slot={0} platforms={platforms} />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {platforms.map((platform, i) => (
        <SocialContentUrlField
          key={platform.value}
          bounty={bounty}
          slot={i}
          platforms={[platform]}
        />
      ))}
    </div>
  );
}

export function SocialAccountNotVerifiedWarning({
  bounty,
  partnerPlatforms,
}: {
  bounty: PartnerBountyProps;
  partnerPlatforms?: Array<{
    type: string;
    verifiedAt: Date | string | null;
  }>;
}) {
  const bountyInfo = resolveBountyDetails(bounty);
  const { program, partner } = useReferralsEmbedData();

  const platforms = bountyInfo?.socialPlatforms ?? [];

  if (platforms.length === 0) {
    return null;
  }

  const missingPlatforms = platforms.filter((platform) => {
    const partnerPlatform = partnerPlatforms?.find(
      (p) => p.type === platform.value,
    );
    return !partnerPlatform?.verifiedAt;
  });

  if (missingPlatforms.length === 0) {
    return null;
  }

  const platformsList = formatSocialPlatformsList(missingPlatforms, "AND");

  return (
    <div className="bg-bg-attention flex flex-col items-center justify-between gap-2 rounded-lg p-2 text-center sm:flex-row">
      <div className="text-content-attention px-2 text-sm font-medium">
        {missingPlatforms.length > 1
          ? `Verified ${platformsList} accounts must be connected to your Dub partner profile to claim this bounty.`
          : `A verified ${platformsList} account must be connected to your Dub partner profile to claim this bounty.`}

        <a
          href="https://dub.co/help/article/partner-profile#website-and-socials"
          target="_blank"
          className="ml-1 underline underline-offset-2"
        >
          Learn more
        </a>
      </div>

      <a
        href={`https://partners.dub.co/${program.slug}/register?email=${partner.email}`}
        target="_blank"
      >
        <Button text="Update profile" className="h-7 w-full px-3 sm:w-fit" />
      </a>
    </div>
  );
}
