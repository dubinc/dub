import { sendTestWebhookEvent } from "@/lib/actions/send-test-webhook";
import useWorkspace from "@/lib/swr/use-workspace";
import { WebhookProps, WebhookTrigger } from "@/lib/types";
import { WEBHOOK_TRIGGER_DESCRIPTIONS } from "@/lib/webhook/constants";
import { Button, Combobox, ComboboxOption, Modal } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

function SendTestWebhookModal({
  showSendTestWebhookModal,
  setShowSendTestWebhookModal,
  webhook,
}: {
  showSendTestWebhookModal: boolean;
  setShowSendTestWebhookModal: Dispatch<SetStateAction<boolean>>;
  webhook: WebhookProps | undefined;
}) {
  const workspace = useWorkspace();
  const [selectedTrigger, setSelectedTrigger] = useState<ComboboxOption | null>(
    null,
  );

  const { execute, isPending } = useAction(sendTestWebhookEvent, {
    onSuccess: () => {
      toast.success("Webhook event sent.");
      setShowSendTestWebhookModal(false);
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const triggers = Object.entries(WEBHOOK_TRIGGER_DESCRIPTIONS).map(
    ([key, value]) => ({
      value: key,
      label: value,
    }),
  );

  return (
    <Modal
      showModal={showSendTestWebhookModal}
      setShowModal={setShowSendTestWebhookModal}
    >
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">
          Send test webhook event
        </h3>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();

          if (!selectedTrigger || !webhook) {
            return;
          }

          execute({
            workspaceId: workspace.id!,
            webhookId: webhook.id,
            trigger: selectedTrigger?.value as WebhookTrigger,
          });
        }}
      >
        <div className="bg-neutral-50 p-4 sm:p-6">
          <p className="text-sm text-neutral-800">
            Choose a webhook event to send to your receiver endpoint
          </p>

          <div className="mt-4">
            <Combobox
              options={triggers}
              selected={selectedTrigger}
              setSelected={setSelectedTrigger}
              placeholder="Select a webhook event"
              matchTriggerWidth
              caret
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
          <Button
            onClick={() => setShowSendTestWebhookModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
          />
          <Button
            disabled={!selectedTrigger}
            text="Send test webhook"
            loading={isPending}
            className="h-8 w-fit px-3"
          />
        </div>
      </form>
    </Modal>
  );
}

export function useSendTestWebhookModal({
  webhook,
}: {
  webhook: WebhookProps | undefined;
}) {
  const [showSendTestWebhookModal, setShowSendTestWebhookModal] =
    useState(false);

  const SendTestWebhookModalCallback = useCallback(() => {
    return (
      <SendTestWebhookModal
        showSendTestWebhookModal={showSendTestWebhookModal}
        setShowSendTestWebhookModal={setShowSendTestWebhookModal}
        webhook={webhook}
      />
    );
  }, [showSendTestWebhookModal, setShowSendTestWebhookModal]);

  return useMemo(
    () => ({
      setShowSendTestWebhookModal,
      SendTestWebhookModal: SendTestWebhookModalCallback,
    }),
    [setShowSendTestWebhookModal, SendTestWebhookModalCallback],
  );
}
