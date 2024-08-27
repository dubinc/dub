import { testSendWebhookEvent } from "@/lib/actions/test-send-webhook";
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

function TestSendWebhookModal({
  showTestSendWebhookModal,
  setShowTestSendWebhookModal,
  webhook,
}: {
  showTestSendWebhookModal: boolean;
  setShowTestSendWebhookModal: Dispatch<SetStateAction<boolean>>;
  webhook: WebhookProps | undefined;
}) {
  const workspace = useWorkspace();
  const [selectedTrigger, setSelectedTrigger] =
    useState<InputSelectItemProps | null>(null);

  const { execute, isExecuting } = useAction(testSendWebhookEvent, {
    onSuccess: () => {
      toast.success("Webhook event sent.");
      setShowTestSendWebhookModal(false);
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
      showModal={showTestSendWebhookModal}
      setShowModal={setShowTestSendWebhookModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 text-center sm:px-16">
        <Logo />
        <h3 className="text-lg font-medium">Test send webhook event</h3>
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

export function useTestSendWebhookModal({
  webhook,
}: {
  webhook: WebhookProps | undefined;
}) {
  const [showTestSendWebhookModal, setShowTestSendWebhookModal] =
    useState(false);

  const TestSendWebhookModalCallback = useCallback(() => {
    return (
      <TestSendWebhookModal
        showTestSendWebhookModal={showTestSendWebhookModal}
        setShowTestSendWebhookModal={setShowTestSendWebhookModal}
        webhook={webhook}
      />
    );
  }, [showTestSendWebhookModal, setShowTestSendWebhookModal]);

  return useMemo(
    () => ({
      setShowTestSendWebhookModal,
      TestSendWebhookModal: TestSendWebhookModalCallback,
    }),
    [setShowTestSendWebhookModal, TestSendWebhookModalCallback],
  );
}
