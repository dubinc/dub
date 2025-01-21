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
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        {
          "bg-red-100 text-red-500": disabledAt,
          "bg-green-100 text-green-500": !disabledAt,
        },
      )}
    >
      {disabledAt ? "Disabled" : "Enabled"}
    </span>
  );
};
