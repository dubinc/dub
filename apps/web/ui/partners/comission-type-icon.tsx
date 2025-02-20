import { PartnerEarningsSchema } from "@/lib/zod/schemas/partner-profile";
import { CursorRays, InvoiceDollar, UserCheck } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { z } from "zod";

const iconsMap = {
  click: { icon: CursorRays, className: "text-blue-500" },
  lead: { icon: UserCheck, className: "text-purple-500" },
  sale: { icon: InvoiceDollar, className: "text-teal-500" },
};

export const CommissionTypeIcon = ({
  type,
  className,
}: {
  type: z.infer<typeof PartnerEarningsSchema>["type"];
  className?: string;
}) => {
  const { icon: Icon, className: iconClassName } = iconsMap[type];

  return <Icon className={cn("size-4", iconClassName, className)} />;
};
