import { sendTestWebhookEvent } from "@/lib/actions/send-test-webhook";
import useWorkspace from "@/lib/swr/use-workspace";
import { WebhookProps, WebhookTrigger } from "@/lib/types";
import { WEBHOOK_TRIGGER_DESCRIPTIONS } from "@/lib/webhook/constants";
import {
  Button,
  InputSelect,
  InputSelectItemProps,
  Logo,
  Modal,
} from "@dub/ui";
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
  const [selectedTrigger, setSelectedTrigger] =
    useState<InputSelectItemProps | null>(null);

  const { execute, isExecuting } = useAction(sendTestWebhookEvent, {
    onSuccess: () => {
      toast.success("Webhook event sent.");
      setShowSendTestWebhookModal(false);
    },
    onError: ({ error }) => {
      toast.error(error.serverError?.serverError);
    },
  });

  const triggers = Object.entries(WEBHOOK_TRIGGER_DESCRIPTIONS).map(
    ([key, value]) => ({
      id: key,
      value: value,
    }),
  );

  return (
    <Modal
      showModal={showSendTestWebhookModal}
      setShowModal={setShowSendTestWebhookModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 text-center sm:px-16">
        <Logo />
        <h3 className="text-lg font-medium">Send test webhook event</h3>
        <p className="text-center text-sm text-gray-500">{webhook?.url}</p>
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
            trigger: selectedTrigger?.id as WebhookTrigger,
          });
        }}
      >
        <div className="flex flex-col space-y-28 bg-gray-50 px-4 py-8 text-left sm:space-y-3 sm:rounded-b-2xl sm:px-16">
          <InputSelect
            items={triggers}
            selectedItem={selectedTrigger}
            setSelectedItem={setSelectedTrigger}
            inputAttrs={{
              placeholder: "Select a webhook event",
            }}
          />
          <Button
            disabled={!selectedTrigger}
            text="Send test webhook"
            loading={isExecuting}
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
