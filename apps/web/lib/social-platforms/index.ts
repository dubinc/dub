import { PlatformType } from "@dub/prisma/client";
import { BasePlatformAdapter } from "./base-adapter";
import { XAdapter } from "./x-adapter";

const PLATFORM_ADAPTERS: Partial<Record<PlatformType, BasePlatformAdapter>> = {
  twitter: new XAdapter(),
};

export function getPlatformAdapter(
  platform: PlatformType,
): BasePlatformAdapter | null {
  return PLATFORM_ADAPTERS[platform] ?? null;
}
