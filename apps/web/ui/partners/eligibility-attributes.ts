import {
  EligibilityAccountAttribute,
  EligibilityProfileAttribute,
} from "@/lib/zod/schemas/programs";
import { Icon } from "@dub/ui";
import {
  BadgeCheck,
  CircleCheck,
  Globe,
  InvoiceDollar,
  LinesY,
  MoneyBills2,
  Page2,
  UserXmark,
} from "@dub/ui/icons";

type EligibilityAttributeMeta = {
  label: string;
  cardLabel: string;
  icon: Icon;
  // Overrides the default size-3.5 icon class for icons whose glyphs read
  // optically smaller at the same rendered size. Icons render inside a
  // fixed-width slot, so this never shifts the text column.
  iconClassName?: string;
};

// Metadata for profile/account eligibility condition attributes:
// `label` is used in the workspace settings condition builder,
// `cardLabel` in the partner-facing program eligibility card.
export const ELIGIBILITY_PROFILE_ATTRIBUTE_META: Record<
  EligibilityProfileAttribute,
  EligibilityAttributeMeta
> = {
  description: {
    label: "Description",
    cardLabel: "Profile description",
    icon: Page2,
  },
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
  preferred_earning_structure: {
    label: "Preferred earning structure",
    cardLabel: "Preferred earning structure",
    icon: MoneyBills2,
    iconClassName: "size-4",
  },
  sales_channels: {
    label: "Sales channels",
    cardLabel: "Sales channels",
    icon: InvoiceDollar,
  },
  estimated_monthly_traffic: {
    label: "Estimated monthly traffic",
    cardLabel: "Estimated monthly traffic",
    icon: LinesY,
  },
};

export const ELIGIBILITY_ACCOUNT_ATTRIBUTE_META: Record<
  EligibilityAccountAttribute,
  EligibilityAttributeMeta
> = {
  dub_network_approved: {
    label: "is Dub Partner Network approved",
    cardLabel: "Approved on the Dub Partner Network",
    icon: BadgeCheck,
    iconClassName: "size-4",
  },
  no_program_bans: {
    label: "has no program bans",
    cardLabel: "Not banned on any programs",
    icon: UserXmark,
  },
};
