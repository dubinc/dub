"use client";

import { getBountyInfo, getSocialContentEmbedUrl } from "@/lib/bounty/utils";
import { BountySubmissionProps, PartnerBountyProps } from "@/lib/types";
import { useSocialContent } from "@/ui/partners/bounties/use-social-content";
import { Loader2 } from "lucide-react";

interface BountySocialContentPreviewProps {
  bounty: Pick<PartnerBountyProps, "id" | "submissionRequirements">;
  submission: Pick<BountySubmissionProps, "urls"> | null | undefined;
}

export function BountySocialContentPreview({
  bounty,
  submission,
}: BountySocialContentPreviewProps) {
  const url = submission?.urls?.[0] ?? "";

  const bountyInfo = getBountyInfo(bounty);
  const platform = bountyInfo?.socialPlatform;

  const { isValidating: isRefreshing } = useSocialContent({
    url,
  });

  if (!url || !platform) {
    return null;
  }

  const embedUrl = getSocialContentEmbedUrl({
    platform: platform.value,
    url,
  });

  if (!embedUrl) {
    return null;
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white p-2">
        <div className="relative">
          {isRefreshing && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
              <Loader2
                className="size-6 animate-spin text-neutral-400"
                aria-hidden
              />
            </div>
          )}

          <div className="relative mx-auto flex aspect-[9/16] max-h-[400px] w-full items-center justify-center overflow-hidden rounded-lg">
            <iframe
              src={embedUrl}
              className="absolute inset-0 size-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </>
  );
}
