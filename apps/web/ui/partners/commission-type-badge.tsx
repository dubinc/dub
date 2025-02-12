import { PartnerEarningsSchema } from "@/lib/zod/schemas/partners";
import { CursorRays, InvoiceDollar, UserCheck } from "@dub/ui/icons";
import { capitalize } from "@dub/utils/src/functions";
import { z } from "zod";

const iconsMap = {
  click: CursorRays,
  lead: UserCheck,
  sale: InvoiceDollar,
};

export const CommissionTypeBadge = ({
  type,
}: {
  type: z.infer<typeof PartnerEarningsSchema>["type"];
}) => {
  const Icon = iconsMap[type];

  return (
    <div className="flex items-center gap-1.5">
      <Icon className="size-4" />
      {capitalize(type)}
    </div>
  );
};
