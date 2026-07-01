import { PARTNER_PLATFORM_FIELDS } from "@/lib/partners/partner-platforms";
import type { Icon } from "@dub/ui/icons";

export type PartnerPlatformDisplayData = ReturnType<
  (typeof PARTNER_PLATFORM_FIELDS)[number]["data"]
> & {
  label: string;
  icon: Icon;
};
