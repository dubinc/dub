import useWebhooks from "@/lib/swr/use-webhooks";
import useWorkspace from "@/lib/swr/use-workspace";
import { LinkFormData } from "@/ui/links/link-builder/link-builder-provider";
import { useLinkBuilderKeyboardShortcut } from "@/ui/links/link-builder/use-link-builder-keyboard-shortcut";
import { Button, Combobox, Modal, Tooltip, Webhook } from "@dub/ui";
import { cn } from "@dub/utils";
import { ChevronsUpDown } from "lucide-react";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useForm, useFormContext } from "react-hook-form";

function WebhooksModal({
  showWebhooksModal,
  setShowWebhooksModal,
}: {
  showWebhooksModal: boolean;
  setShowWebhooksModal: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <Modal
      showModal={showWebhooksModal}
      setShowModal={setShowWebhooksModal}
      className="sm:max-w-md"
    >
      <WebhooksModalInner setShowWebhooksModal={setShowWebhooksModal} />
    </Modal>
  );
}

function WebhooksModalInner({
  setShowWebhooksModal,
}: {
  setShowWebhooksModal: Dispatch<SetStateAction<boolean>>;
}) {
  const {
    watch: watchParent,
    getValues: getValuesParent,
    setValue: setValueParent,
  } = useFormContext<LinkFormData>();

  const {
    watch,
    setValue,
    reset,
    formState: { isDirty },
    handleSubmit,
  } = useForm<Pick<LinkFormData, "webhookIds">>({
    values: {
      webhookIds: getValuesParent("webhookIds"),
    },
  });

  const parentWebhookIds = watchParent("webhookIds");
  const webhookIds = watch("webhookIds");

  return (
    <form
      className="px-5 py-4"
      onSubmit={(e) => {
        e.stopPropagation();
        handleSubmit((data) => {
          setValueParent("webhookIds", data.webhookIds, { shouldDirty: true });
          setShowWebhooksModal(false);
        })(e);
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Link Webhooks</h3>
        </div>
        <div className="max-md:hidden">
          <Tooltip
            content={
              <div className="px-2 py-1 text-xs text-neutral-700">
                Press{" "}
                <strong className="font-medium text-neutral-950">W</strong> to
                open this quickly
              </div>
            }
            side="right"
          >
            <kbd className="flex size-6 cursor-default items-center justify-center rounded-md border border-neutral-200 font-sans text-xs text-neutral-950">
              W
            </kbd>
          </Tooltip>
        </div>
      </div>

      <div className="mt-6">
        <span className="mb-1 block text-sm font-normal text-neutral-500">
          Webhooks
        </span>
        <WebhookSelect
          webhookIds={webhookIds as string[]}
          onChange={(webhookIds) =>
            setValue("webhookIds", webhookIds, { shouldDirty: true })
          }
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div>
          {Boolean(parentWebhookIds?.length) && (
            <button
              type="button"
              className="text-xs font-medium text-neutral-700 transition-colors hover:text-neutral-950"
              onClick={() => {
                setValueParent("webhookIds", [], { shouldDirty: true });
                setShowWebhooksModal(false);
              }}
            >
              Remove webhooks
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            text="Cancel"
            className="h-9 w-fit"
            onClick={() => {
              reset();
              setShowWebhooksModal(false);
            }}
          />
          <Button
            type="submit"
            variant="primary"
            text="Save webhooks"
            className="h-9 w-fit"
            disabled={!isDirty}
          />
        </div>
      </div>
    </form>
  );
}

export function useWebhooksModal() {
  const [showWebhooksModal, setShowWebhooksModal] = useState(false);

  const WebhooksModalCallback = useCallback(() => {
    return (
      <WebhooksModal
        showWebhooksModal={showWebhooksModal}
        setShowWebhooksModal={setShowWebhooksModal}
      />
    );
  }, [showWebhooksModal, setShowWebhooksModal]);

  return useMemo(
    () => ({
      setShowWebhooksModal,
      WebhooksModal: WebhooksModalCallback,
    }),
    [setShowWebhooksModal, WebhooksModalCallback],
  );
}

export function WebhookSelect({
  webhookIds,
  onChange,
}: {
  webhookIds: string[];
  onChange: (webhookIds: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { webhooks: availableWebhooks } = useWebhooks();

  useLinkBuilderKeyboardShortcut("w", () => setIsOpen(true));

  const options = useMemo(
    () =>
      availableWebhooks?.map((webhook) => ({
        label: webhook.name,
        value: webhook.id,
        icon: <Webhook className="size-3.5" />,
      })),
    [availableWebhooks],
  );

  const selectedWebhooks = useMemo(
    () =>
      webhookIds
        .map((id) => options?.find(({ value }) => value === id)!)
        .filter(Boolean),

    [webhookIds, options],
  );

  const hasSelectedWebhooks = selectedWebhooks.length > 0;

  return (
    <Combobox
      multiple
      selected={selectedWebhooks || []}
      setSelected={(webhooks) => {
        const selectedIds = webhooks.map(({ value }) => value);
        onChange(selectedIds);
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
      placeholder="Webhooks"
      searchPlaceholder="Search webhooks..."
      buttonProps={{
        className:
          "h-10 px-2.5 w-full bg-white font-normal border-neutral-200 bg-white",
      }}
      matchTriggerWidth
      caret={
        <ChevronsUpDown className="ml-2 size-4 shrink-0 text-neutral-400" />
      }
      open={isOpen}
      onOpenChange={setIsOpen}
      emptyState={<NoWebhooksFound />}
    >
      {selectedWebhooks.length > 0
        ? selectedWebhooks.length === 1
          ? selectedWebhooks[0].label
          : `${selectedWebhooks.length} Webhooks`
        : "Webhooks"}
    </Combobox>
  );
}

const NoWebhooksFound = () => {
  const { slug } = useWorkspace();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-2 py-4 text-center text-sm">
      <div className="flex items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
        <Webhook className="size-6 text-neutral-700" />
      </div>
      <p className="mt-2 font-medium text-neutral-950">No webhooks found</p>
      <p className="mx-auto mt-1 w-full max-w-[180px] text-neutral-700">
        Add a webhook to receive a click event when someone clicks your link.
      </p>
      <div>
        <Button
          className="mt-1 h-8"
          onClick={() => window.open(`/${slug}/settings/webhooks`, "_blank")}
          text="Add webhook"
        />
      </div>
    </div>
  );
};
