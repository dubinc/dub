import { PartnerEarningsSchema } from "@/lib/zod/schemas/partner-profile";
import {
  CursorRays,
  InvoiceDollar,
  MoneyBills2,
  UserCheck,
} from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { z } from "zod";

const ICONS_MAP = {
  click: { icon: CursorRays, className: "text-blue-500" },
  lead: { icon: UserCheck, className: "text-purple-500" },
  sale: { icon: InvoiceDollar, className: "text-teal-500" },
  custom: { icon: MoneyBills2, className: "text-gray-500" },
};

export const CommissionTypeIcon = ({
  type,
  className,
}: {
  type: z.infer<typeof PartnerEarningsSchema>["type"];
  className?: string;
}) => {
  const { icon: Icon, className: iconClassName } = ICONS_MAP[type];

  return <Icon className={cn("size-4", iconClassName, className)} />;
};
