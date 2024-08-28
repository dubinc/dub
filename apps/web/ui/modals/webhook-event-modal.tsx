import z from "@/lib/zod";
import { webhookEventSchemaTB } from "@/lib/zod/schemas/webhooks";
import { Modal } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";

function WebhookInfoModal({
  showWebhookInfoModal,
  setShowWebhookInfoModal,
  event,
}: {
  showWebhookInfoModal: boolean;
  setShowWebhookInfoModal: Dispatch<SetStateAction<boolean>>;
  event: z.infer<typeof webhookEventSchemaTB>;
}) {
  return (
    <Modal
      showModal={showWebhookInfoModal}
      setShowModal={setShowWebhookInfoModal}
      className="flex max-h-[75vh] max-w-screen-md flex-col overflow-y-auto bg-gray-50"
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-4 pt-8 sm:px-16">
        <h3 className="text-lg font-medium">{event.event}</h3>
        <p className="text-center text-sm text-gray-500">{event.event_id}</p>
      </div>
      <div className="m-8 overflow-auto rounded-md border border-gray-200 bg-white p-8">
        <pre className="text-sm text-gray-500">
          {JSON.stringify(event.request_body, null, 2)}
        </pre>
      </div>
    </Modal>
  );
}

export function useWebhookInfoModal({
  event,
}: {
  event: z.infer<typeof webhookEventSchemaTB>;
}) {
  const [showWebhookInfoModal, setShowWebhookInfoModal] = useState(false);

  const WebhookInfoModalCallback = useCallback(() => {
    return (
      <WebhookInfoModal
        showWebhookInfoModal={showWebhookInfoModal}
        setShowWebhookInfoModal={setShowWebhookInfoModal}
        event={event}
      />
    );
  }, [showWebhookInfoModal, setShowWebhookInfoModal]);

  return useMemo(
    () => ({
      setShowWebhookInfoModal,
      WebhookInfoModal: WebhookInfoModalCallback,
    }),
    [setShowWebhookInfoModal, WebhookInfoModalCallback],
  );
}
