import { CursorRays, InvoiceDollar, UserPlus } from "@dub/ui/icons";

export const REWARD_EVENTS = {
  click: {
    icon: CursorRays,
    text: "Click reward",
    event: "click",
    shortcut: "C",
    eventName: "click",
  },
  lead: {
    icon: UserPlus,
    text: "Lead reward",
    event: "lead",
    shortcut: "L",
    eventName: "signup",
  },
  sale: {
    icon: InvoiceDollar,
    text: "Sale reward",
    event: "sale",
    shortcut: "S",
    eventName: "sale",
  },
} as const;

export const STRIPE_ERROR_MAP: Record<
  string,
  { title: string; ctaLabel: string; ctaUrl: string }
> = {
  STRIPE_CONNECTION_REQUIRED: {
    title: "Stripe connection required",
    ctaLabel: "Install Stripe app",
    ctaUrl: "https://marketplace.stripe.com/apps/dub-conversions",
  },
  STRIPE_APP_UPGRADE_REQUIRED: {
    title: "Stripe app upgrade required",
    ctaLabel: "Review permissions",
    ctaUrl: "https://marketplace.stripe.com/apps/dub-conversions",
  },
};
