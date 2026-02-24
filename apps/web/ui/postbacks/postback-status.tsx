import { Postback } from "@dub/prisma/client";
import { Badge } from "@dub/ui";
import { cn } from "@dub/utils";

export function PostbackStatus({ disabledAt }: Pick<Postback, "disabledAt">) {
  const isDisabled = !!disabledAt;

  return (
    <Badge
      variant={isDisabled ? "neutral" : "green"}
      className={cn(isDisabled && "border-red-100 bg-red-100 text-red-500")}
    >
      {isDisabled ? "Disabled" : "Enabled"}
    </Badge>
  );
}
