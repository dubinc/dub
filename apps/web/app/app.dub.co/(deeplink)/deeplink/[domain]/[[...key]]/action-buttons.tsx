"use client";

import { Link } from "@dub/prisma/client";
import { Button, useCopyToClipboard } from "@dub/ui";
import { cn } from "@dub/utils";
import { useSearchParams } from "next/navigation";
import { getTranslations, Language } from "./translations";

export function DeepLinkActionButtons({
  link,
  language,
  platform,
  androidPackageName,
  buttonClassnames,
}: {
  link: Pick<Link, "shortLink">;
  language: Language;
  platform: "ios" | "android";
  androidPackageName: string | null;
  buttonClassnames?: string;
}) {
  const t = getTranslations(language);
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  const [_copied, copyToClipboard] = useCopyToClipboard();

  const handleClick = async () => {
    await copyToClipboard(
      `${link.shortLink}${searchParamsString ? `?${searchParamsString}` : ""}`,
    );

    // Firefox on Android has a known bug where S.browser_fallback_url always
    // wins over launching the installed app (mozilla/fenix#23397), so we keep
    // the plain https:// path for Firefox users to avoid regressing them.
    const isFirefox = /Firefox|FxiOS/i.test(navigator.userAgent);
    if (platform === "android" && androidPackageName && !isFirefox) {
      const url = new URL(link.shortLink);
      const userQuery = searchParamsString ? `?${searchParamsString}` : "";
      const fallback = `${link.shortLink}?skip_deeplink_preview=1${
        searchParamsString ? `&${searchParamsString}` : ""
      }`;
      const extras = [
        `scheme=${url.protocol.replace(":", "")}`,
        `package=${androidPackageName}`,
        `S.browser_fallback_url=${encodeURIComponent(fallback)}`,
        "end",
      ].join(";");

      window.location.href = `intent://${url.host}${url.pathname}${userQuery}#Intent;${extras}`;
      return;
    }

    window.location.href = `${link.shortLink}?skip_deeplink_preview=1${searchParamsString ? `&${searchParamsString}` : ""}`;
  };

  return (
    <Button
      text={t.openInApp}
      className={cn("h-12 w-full font-medium text-white", buttonClassnames)}
      onClick={handleClick}
    />
  );
}
