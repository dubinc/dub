import useWebhooks from "@/lib/swr/use-webhooks";
import { Combobox, useKeyboardShortcut } from "@dub/ui";
import { cn } from "@dub/utils";
import { Webhook } from "lucide-react";
import { useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { LinkFormData } from ".";

export function WebhookSelect() {
  const { webhooks } = useWebhooks();
  const [isOpen, setIsOpen] = useState(false);
  const { watch, setValue } = useFormContext<LinkFormData>();
  useKeyboardShortcut("w", () => setIsOpen(true), { modal: true });

  const webhookIds = watch("webhookIds");

  const linkLevelWebhooks = webhooks?.filter((webhook) =>
    webhook.triggers.includes("link.clicked"),
  );

  const options = useMemo(
    () =>
      linkLevelWebhooks?.map((webhook) => ({
        label: webhook.name,
        value: webhook.id,
        icon: <Webhook className="size-4" />,
      })),
    [webhooks],
  );

  const selectedWebhooks = useMemo(
    () =>
      webhooks
        ?.filter((webhook) => webhookIds?.includes(webhook.id))
        .map((webhook) => ({
          label: webhook.name,
          value: webhook.id,
          icon: <Webhook className="size-4" />,
        })) || [],

    [webhookIds, webhooks],
  );

  const hasSelectedWebhooks = selectedWebhooks.length > 0;

  return (
    <Combobox
      multiple
      selected={selectedWebhooks || []}
      setSelected={(webhooks) => {
        const selectedIds = webhooks.map(({ value }) => value);
        setValue("webhookIds", selectedIds, { shouldDirty: true });
      }}
      options={options}
      icon={
        <Webhook
          className={cn("size-4", hasSelectedWebhooks && "text-blue-500")}
        />
      }
      side="bottom"
      placeholder="Webhooks"
      searchPlaceholder="Search webhooks..."
      shortcutHint="W"
      buttonProps={{
        className:
          "h-9 px-2.5 w-fit font-medium text-gray-700 max-w-48 min-w-0",
      }}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      {selectedWebhooks.length > 0
        ? selectedWebhooks.length === 1
          ? selectedWebhooks[0].label
          : `${selectedWebhooks.length} Webhooks`
        : "Webhooks"}
    </Combobox>
  );
}
