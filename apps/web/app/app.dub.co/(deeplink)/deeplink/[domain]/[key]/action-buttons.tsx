"use client";

import { Button, IOSAppStore, useCopyToClipboard } from "@dub/ui";
import { Link } from "@prisma/client";
import { useSearchParams } from "next/navigation";

export function DeepLinkActionButtons({
  link,
}: {
  link: Pick<Link, "shortLink">;
}) {
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  const [_copied, copyToClipboard] = useCopyToClipboard();

  const handleClick = async ({ withCopy }: { withCopy?: boolean } = {}) => {
    if (withCopy) {
      await copyToClipboard(
        `${link.shortLink}${searchParamsString ? `?${searchParamsString}` : ""}`,
      );
    }

    window.location.href = `${link.shortLink}?skip_deeplink_preview=1${searchParamsString ? `&${searchParamsString}` : ""}`;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Button
        text="Open in the app"
        className="h-12 w-full rounded-xl bg-neutral-900 text-white"
        variant="primary"
        onClick={() => handleClick({ withCopy: true })}
        icon={<IOSAppStore className="size-6" />}
      />

      <button
        onClick={() => handleClick()}
        className="text-sm text-neutral-500"
      >
        Open in the app without copying
      </button>
    </div>
  );
}
