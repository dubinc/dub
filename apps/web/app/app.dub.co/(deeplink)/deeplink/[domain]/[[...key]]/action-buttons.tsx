"use client";

import { Link } from "@dub/prisma/client";
import { Button, IOSAppStore, useCopyToClipboard } from "@dub/ui";
import { useSearchParams } from "next/navigation";
import { getTranslations, Language } from "./translations";

export function DeepLinkActionButtons({
  link,
  language,
}: {
  link: Pick<Link, "shortLink">;
  language: Language;
}) {
  const t = getTranslations(language);
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
        text={t.openInApp}
        className="h-12 w-full rounded-xl bg-neutral-900 text-white"
        variant="primary"
        onClick={() => handleClick({ withCopy: true })}
        icon={<IOSAppStore className="size-6" />}
      />

      <button
        onClick={() => handleClick()}
        className="text-sm text-neutral-500"
      >
        {t.openInAppWithoutCopying}
      </button>
    </div>
  );
}
