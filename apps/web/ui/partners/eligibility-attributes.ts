import { EligibilityProfileAttribute } from "@/lib/zod/schemas/programs";
import { Icon } from "@dub/ui";
import { CircleCheck, Globe, UserXmark } from "@dub/ui/icons";

type EligibilityAttributeMeta = {
  label: string;
  cardLabel: string;
  icon: Icon;
  // Overrides the default size-3.5 icon class for icons whose glyphs read
  // optically smaller at the same rendered size. Icons render inside a
  // fixed-width slot, so this never shifts the text column.
  iconClassName?: string;
};

// Metadata for profile eligibility condition attributes:
// `label` is used in the workspace settings condition builder,
// `cardLabel` in the partner-facing program eligibility card.
export const ELIGIBILITY_PROFILE_ATTRIBUTE_META: Record<
  EligibilityProfileAttribute,
  EligibilityAttributeMeta
> = {
  verified_website: {
    label: "Verified website",
    cardLabel: "Verified website",
    icon: Globe,
  },
  verified_social_account: {
    label: "Verified social account",
    cardLabel: "Verified social account",
    icon: CircleCheck,
  },
  no_program_bans: {
    label: "No program bans",
    cardLabel: "Not banned on any programs",
    icon: UserXmark,
  },
};
