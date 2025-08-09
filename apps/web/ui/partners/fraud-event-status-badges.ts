import { ShieldAlert, ShieldCheck } from "@dub/ui/icons";
import { Flag } from "lucide-react";

export const FraudEventStatusBadges = {
  pending: {
    label: "Pending",
    variant: "pending",
    className: "text-orange-600 bg-orange-100",
    icon: Flag,
  },
  safe: {
    label: "Safe",
    variant: "success",
    className: "text-green-600 bg-green-100",
    icon: ShieldCheck,
  },
  banned: {
    label: "Banned",
    variant: "error",
    className: "text-red-600 bg-red-100",
    icon: ShieldAlert,
  },
};
