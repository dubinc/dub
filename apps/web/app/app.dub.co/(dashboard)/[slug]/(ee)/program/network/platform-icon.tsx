import { Globe, Instagram, LinkedIn, TikTok, Twitter, User, YouTube } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import type { PlatformType } from "@prisma/client";

// Shared platform → brand icon map for the network search surfaces (detail page +
// results list). Unknown platforms fall back to a generic person icon.
export const PLATFORM_ICONS: Partial<Record<PlatformType, typeof User>> = {
  youtube: YouTube,
  instagram: Instagram,
  tiktok: TikTok,
  twitter: Twitter,
  linkedin: LinkedIn,
  website: Globe,
};

export function PlatformIcon({
  platform,
  className,
}: {
  platform: string;
  className?: string;
}) {
  const Icon = PLATFORM_ICONS[platform as PlatformType] ?? User;

  return <Icon className={cn("size-4", className)} />;
}
