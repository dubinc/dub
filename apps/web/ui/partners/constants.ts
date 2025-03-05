import { CursorRays, MoneyBill } from "@dub/ui/icons";
import { UserPlus } from "lucide-react";

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
    icon: MoneyBill,
    text: "Sale reward",
    event: "sale",
    shortcut: "S",
    eventName: "sale",
  },
} as const;
