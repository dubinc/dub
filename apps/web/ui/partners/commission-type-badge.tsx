import { PartnerEarningsSchema } from "@/lib/zod/schemas/partner-profile";
import { capitalize } from "@dub/utils";
import { z } from "zod";
import { CommissionTypeIcon } from "./comission-type-icon";

export const CommissionTypeBadge = ({
  type,
}: {
  type: z.infer<typeof PartnerEarningsSchema>["type"];
}) => {
  return (
    <div className="flex items-center gap-1.5">
      <CommissionTypeIcon type={type} />
      {capitalize(type)}
    </div>
  );
};
