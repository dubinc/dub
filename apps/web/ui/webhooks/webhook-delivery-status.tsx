import { WebhookProps } from "@/lib/types";
import { cn } from "@dub/utils";

export const WebhookDeliveryStatus = ({
  disabled,
}: Pick<WebhookProps, "disabled">) => {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full p-1.5 text-xs font-medium",
        disabled ? "bg-red-500 text-white" : "bg-green-500 text-black",
      )}
      title={disabled ? "Disabled" : "Enabled"}
    />
  );
};
