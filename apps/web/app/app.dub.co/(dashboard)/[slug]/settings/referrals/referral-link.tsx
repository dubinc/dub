import { CopyButton } from "@dub/ui";
import { CircleWarning } from "@dub/ui/src/icons";
import { getPrettyUrl } from "@dub/utils";
import { GenerateButton } from "./generate-button";
import { getReferralLink } from "./get-referral-link";
import { InviteButton } from "./invite-button";

export default async function ReferralLink({ slug }: { slug: string }) {
  const { shortLink } = (await getReferralLink(slug)) || {};

  return (
    <div className="mt-8">
      {shortLink ? (
        <div className="grid gap-1.5">
          <p className="text-xs text-gray-500">Referral Link</p>
          <div className="grid grid-cols-1 gap-x-2 gap-y-2 sm:max-w-sm sm:grid-cols-[1fr_auto] xl:max-w-md">
            <div className="flex h-9 items-center justify-between gap-x-2 rounded-lg border border-gray-300 bg-white py-1.5 pl-4 pr-2">
              <p className="text-sm text-gray-500">{getPrettyUrl(shortLink)}</p>
              <CopyButton
                value={shortLink}
                variant="neutral"
                className="p-1.5 text-gray-500"
              />
            </div>
            <InviteButton />
          </div>
        </div>
      ) : (
        <GenerateButton />
      )}
    </div>
  );
}

export function ReferralLinkSkeleton() {
  return (
    <p className="text-sm text-gray-500">
      <CircleWarning className="-mt-0.5 mr-1.5 inline-block size-4" />
      Failed to load referral link. Please try again later or contact support.
    </p>
  );
}
