"use client";

import { deepViewDataSchema } from "@/lib/zod/schemas/deep-links";
import { Link } from "@dub/prisma/client";
import { Button, useCopyToClipboard } from "@dub/ui";
import { useSearchParams } from "next/navigation";
import * as z from "zod/v4";
import { getTranslations, Language } from "./translations";

export function DeepLinkActionButtons({
  link,
  language,
  buttonStyle,
}: {
  link: Pick<Link, "shortLink">;
  language: Language;
  buttonStyle?: z.infer<typeof deepViewDataSchema>["buttonStyle"];
}) {
  const t = getTranslations(language);
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  const [_copied, copyToClipboard] = useCopyToClipboard();

  const handleClick = async () => {
    await copyToClipboard(
      `${link.shortLink}${searchParamsString ? `?${searchParamsString}` : ""}`,
    );
    window.location.href = `${link.shortLink}?skip_deeplink_preview=1${searchParamsString ? `&${searchParamsString}` : ""}`;
  };

  return (
    <Button
      text={t.openInApp}
      className="h-12 w-full font-medium text-white"
      onClick={handleClick}
      {...(buttonStyle && {
        style: {
          backgroundColor: buttonStyle.backgroundColor,
          borderRadius: buttonStyle.borderRadius,
          borderColor: buttonStyle.borderColor,
        },
      })}
    />
  );
}
