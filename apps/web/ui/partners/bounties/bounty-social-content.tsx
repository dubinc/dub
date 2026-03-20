"use client";

import { resolveBountyDetails } from "@/lib/bounty/utils";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PartnerBountyProps, SocialContent } from "@/lib/types";
import { useClaimBountyContext } from "@/ui/partners/bounties/claim-bounty-context";
import { useClaimBountyForm } from "@/ui/partners/bounties/use-claim-bounty-form";
import { useSocialContent } from "@/ui/partners/bounties/use-social-content";
import { ButtonLink } from "@/ui/placeholders/button-link";
import { CircleCheckFill, LoadingSpinner } from "@dub/ui";
import { cn, formatDate } from "@dub/utils";
import { useReferralsEmbedData } from "app/(ee)/app.dub.co/embed/referrals/page-client";
import { AlertTriangle } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { evaluateSocialContentRequirements } from "./evaluate-social-content-requirements";

function SocialContentRequirementChecks({
  content,
  bounty,
}: {
  content: SocialContent | null;
  bounty: PartnerBountyProps;
}) {
  const { partner } = usePartnerProfile();

  const bountyInfo = resolveBountyDetails(bounty);
  const socialPlatform = bountyInfo?.socialPlatform;

  const partnerPlatform = partner?.platforms?.find(
    (p) => p.type === socialPlatform?.value,
  );

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
        <CircleCheckFill
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
        <CircleCheckFill
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

export function SocialContentUrlField({
  bounty,
}: {
  bounty: PartnerBountyProps;
}) {
  const { partner } = usePartnerProfile();
  const { setSocialContentRequirementsMet } = useClaimBountyContext();

  const { watch, setValue, getValues, setSocialContentVerifying } =
    useClaimBountyForm();

  const [urlToCheck, setUrlToCheck] = useState<string>("");
  const inputId = useId();

  const contentUrl = watch("urls")?.[0] ?? "";

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
    setSocialContentVerifying(isValidating);
    return () => setSocialContentVerifying(false);
  }, [isValidating, setSocialContentVerifying]);

  const bountyInfo = resolveBountyDetails(bounty);
  const partnerPlatform = partner?.platforms?.find(
    (p) => p.type === bountyInfo?.socialPlatform?.value,
  );

  useEffect(() => {
    const checks = evaluateSocialContentRequirements({
      content: data,
      bounty,
      partnerPlatform,
    });

    setSocialContentRequirementsMet(
      checks.isPostedFromYourAccount && checks.isAfterStartDate,
    );

    return () => setSocialContentRequirementsMet(true);
  }, [data, bounty, partnerPlatform, setSocialContentRequirementsMet]);

  const showIcon = isValidating || (error && urlToCheck);

  if (!bountyInfo?.socialPlatform) {
    return null;
  }

  const handleChange = (value: string) => {
    const prev = getValues("urls") ?? [];
    setValue("urls", [value, ...prev.slice(1)], { shouldDirty: true });
  };

  const handleBlur = () => {
    const trimmed = contentUrl.trim();
    const prev = getValues("urls") ?? [];
    setValue("urls", [trimmed, ...prev.slice(1)], { shouldDirty: true });
    setUrlToCheck(trimmed);
  };

  return (
    <div>
      <label htmlFor={inputId} className="block">
        <span className="text-sm font-medium text-neutral-900">
          {`${bountyInfo?.socialPlatform.label} URL`}
        </span>
      </label>
      <div className="relative mt-2">
        <input
          id={inputId}
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder={bountyInfo?.socialPlatform.placeholder}
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
      <SocialContentRequirementChecks content={data} bounty={bounty} />
    </div>
  );
}

export function SocialAccountNotVerifiedWarning({
  bounty,
}: {
  bounty: PartnerBountyProps;
}) {
  const bountyInfo = resolveBountyDetails(bounty);

  const { program, partner } = useReferralsEmbedData();

  if (!bountyInfo?.socialPlatform) {
    return null;
  }

  return (
    <div className="bg-bg-attention flex flex-col items-center justify-between gap-2 rounded-lg p-2 text-center sm:flex-row">
      <div className="text-content-attention px-2 text-sm font-medium">
        {`A verified ${bountyInfo.socialPlatform.label} account must be connected to your Dub partner profile to claim this bounty.`}

        <a
          href="https://dub.co/help/article/partner-profile#website-and-socials"
          target="_blank"
          className="ml-1 underline underline-offset-2"
        >
          Learn more
        </a>
      </div>

      <ButtonLink
        variant="primary"
        href={`https://partners.dub.co/${program.slug}/register?email=${partner.email}`}
        target="_blank"
        rel="noopener noreferrer"
        className="h-7 w-full justify-center rounded-lg sm:w-fit"
      >
        View profile
      </ButtonLink>
    </div>
  );
}
