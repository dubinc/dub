import { getPlatformAdapter } from "@/lib/social-platforms";
import { PlatformType } from "@dub/prisma/client";
export { AccountNotFoundError } from "@/lib/social-platforms/scrape-creators";

interface GetSocialProfileParams {
  platform: PlatformType;
  handle: string;
}

export async function getSocialProfile({
  platform,
  handle,
}: GetSocialProfileParams) {
  const platformAdapter = getPlatformAdapter(platform);

  if (!platformAdapter) {
    throw new Error("Unsupported platform");
  }

  return platformAdapter.fetchProfile(handle);
}
