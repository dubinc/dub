import { PlatformType } from "@dub/prisma/client";
import { BasePlatformAdapter } from "./base-adapter";
import { InstagramAdapter } from "./instagram-adapter";
import { TikTokAdapter } from "./tiktok-adapter";
import { XAdapter } from "./x-adapter";
import { YouTubeAdapter } from "./youtube-adapter";

const PLATFORM_ADAPTERS: Partial<Record<PlatformType, BasePlatformAdapter>> = {
  twitter: new XAdapter(),
  youtube: new YouTubeAdapter(),
  instagram: new InstagramAdapter(),
  tiktok: new TikTokAdapter(),
};

export function getPlatformAdapter(
  platform: PlatformType,
): BasePlatformAdapter | null {
  return PLATFORM_ADAPTERS[platform] ?? null;
}
