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
