import { WebhookProps } from "@/lib/types";
import { cn } from "@dub/utils";

export const WebhookStatus = ({
  webhook,
}: {
  webhook: Pick<WebhookProps, "disabledAt">;
}) => {
  const { disabledAt } = webhook;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full p-1.5 text-xs font-medium",
        disabledAt ? "bg-red-500 text-white" : "bg-green-500 text-black",
      )}
      title={disabledAt ? "Disabled" : "Enabled"}
    />
  );
};
