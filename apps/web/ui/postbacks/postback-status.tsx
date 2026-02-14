import { PartnerPostback } from "@dub/prisma/client";
import { Badge } from "@dub/ui";

export function PostbackStatus(postback: Pick<PartnerPostback, "disabledAt">) {
  const isDisabled = !!postback.disabledAt;

  return (
    <Badge
      variant={isDisabled ? "neutral" : "green"}
      className={
        isDisabled ? "border-red-100 bg-red-100 text-red-500" : undefined
      }
    >
      {isDisabled ? "Disabled" : "Enabled"}
    </Badge>
  );
}
