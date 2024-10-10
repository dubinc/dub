import useWebhooks from "@/lib/swr/use-webhooks";
import { Combobox, useKeyboardShortcut, Webhook } from "@dub/ui";
import { cn } from "@dub/utils";
import { useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { LinkFormData } from ".";

export function WebhookSelect() {
  const [isOpen, setIsOpen] = useState(false);
  const { webhooks: availableWebhooks } = useWebhooks();
  const { watch, setValue } = useFormContext<LinkFormData>();

  useKeyboardShortcut("w", () => setIsOpen(true), { modal: true });
  const webhooks = watch("webhooks") || [];

  const linkLevelWebhooks = availableWebhooks?.filter((webhook) =>
    webhook.triggers.includes("link.clicked"),
  );

  const options = useMemo(
    () =>
      linkLevelWebhooks?.map((webhook) => ({
        label: webhook.name,
        value: webhook.id,
        icon: <Webhook className="size-3.5" />,
      })),
    [availableWebhooks],
  );

  const selectedWebhooks = useMemo(
    () =>
      webhooks
        .map(({ id }) => options?.find(({ value }) => value === id)!)
        .filter(Boolean),

    [webhooks, options],
  );

  const hasSelectedWebhooks = selectedWebhooks.length > 0;

  return (
    <Combobox
      multiple
      selected={selectedWebhooks || []}
      setSelected={(webhooks) => {
        const selectedIds = webhooks.map(({ value }) => value);

        setValue(
          "webhooks",
          selectedIds.map((id) => availableWebhooks?.find((t) => t.id === id)),
          { shouldDirty: true },
        );
      }}
      options={options}
      icon={
        <Webhook
          className={cn(
            "size-3.5 flex-none",
            hasSelectedWebhooks && "text-blue-500",
          )}
        />
      }
      side="top"
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
