import { BountySocialPlatform } from "@/lib/types";
import { Instagram, TikTok, Twitter, YouTube } from "@dub/ui";
import { ComponentType } from "react";

export const PLATFORM_ICONS: Record<
  BountySocialPlatform,
  ComponentType<{ className?: string }>
> = {
  youtube: YouTube,
  tiktok: TikTok,
  instagram: Instagram,
  twitter: Twitter,
};
