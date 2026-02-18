"use client";

import { getBountySocialPlatform } from "@/lib/bounty/utils";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { PartnerBountyProps, SocialContent } from "@/lib/types";
import { useClaimBountyForm } from "@/ui/partners/bounties/use-claim-bounty-form";
import { useSocialContent } from "@/ui/partners/bounties/use-social-content";
import { Button, CircleCheckFill, LoadingSpinner } from "@dub/ui";
import { cn, formatDate } from "@dub/utils";
import { isBefore } from "date-fns";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

function SocialContentRequirementChecks({
  content,
  bounty,
}: {
  content: SocialContent | null;
  bounty: PartnerBountyProps;
}) {
  const { partner } = usePartnerProfile();
  const socialPlatform = getBountySocialPlatform(bounty);

  const partnerPlatform = partner?.platforms?.find(
    (p) => p.type === socialPlatform?.value,
  );

  const isPostedFromYourAccount =
    partnerPlatform &&
    partnerPlatform.verifiedAt &&
    partnerPlatform.identifier === content?.handle;

  const isAfterStartDate =
    content?.publishedAt &&
    bounty.startsAt &&
    !isBefore(content.publishedAt, bounty.startsAt);

  return (
    <ul className="mt-2 flex flex-wrap items-center gap-3">
      <li
        className={cn(
          "flex items-center gap-1 text-xs transition-colors",
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
          "flex items-center gap-1 text-xs transition-colors",
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
  const { programEnrollment } = useProgramEnrollment();
  const { setValue, getValues } = useClaimBountyForm();

  const initialUrl = (getValues("urls") ?? [])[0] ?? "";

  const [localUrl, setLocalUrl] = useState(initialUrl);
  const [urlToCheck, setUrlToCheck] = useState<string>("");

  const { data, error, isValidating } = useSocialContent({
    programId: programEnrollment?.programId,
    bountyId: bounty.id,
    url: urlToCheck,
  });

  const socialPlatform = getBountySocialPlatform(bounty);

  const showIcon = isValidating || (error && urlToCheck);

  if (!socialPlatform) {
    return null;
  }

  const handleBlur = () => {
    const trimmed = localUrl.trim();
    const prev = getValues("urls") ?? [];
    setValue("urls", [trimmed, ...prev.slice(1)]);
    setUrlToCheck(trimmed);
  };

  return (
    <div>
      <label className="block">
        <h2 className="text-sm font-medium text-neutral-900">
          {`${socialPlatform.label} URL`}
        </h2>
      </label>
      <div className="relative mt-2">
        <input
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder={socialPlatform.placeholder}
          value={localUrl}
          onChange={(e) => setLocalUrl(e.target.value)}
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
  const channel = getBountySocialPlatform(bounty);

  if (!channel) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-orange-50 p-2 text-center">
      <div className="px-2 text-sm font-medium text-orange-900">
        {`A verified ${channel?.label} account must be connected to your Dub partner profile to claim this bounty.`}

        <Link
          href="https://dub.co/help/article/receiving-payouts"
          target="_blank"
          className="ml-1 underline underline-offset-2"
        >
          Learn more
        </Link>
      </div>

      <Button text="View profile" className="h-7 w-full rounded-lg" />
    </div>
  );
}
