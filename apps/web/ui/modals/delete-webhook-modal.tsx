import useWorkspace from "@/lib/swr/use-workspace";
import { WebhookProps } from "@/lib/types";
import { BlurImage, Button, Logo, Modal, useMediaQuery } from "@dub/ui";
import { useRouter } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

function DeleteWebhookModal({
  showDeleteWebhookModal,
  setShowDeleteWebhookModal,
  webhook,
}: {
  showDeleteWebhookModal: boolean;
  setShowDeleteWebhookModal: Dispatch<SetStateAction<boolean>>;
  webhook: Pick<WebhookProps, "id" | "name" | "url"> | undefined;
}) {
  const router = useRouter();
  const { isMobile } = useMediaQuery();
  const [deleting, setDeleting] = useState(false);
  const { id: workspaceId, slug: workspaceSlug, logo } = useWorkspace();

  const deleteWebhook = async () => {
    setDeleting(true);

    const response = await fetch(
      `/api/webhooks/${webhook?.id}?workspaceId=${workspaceId}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      },
    );

    setDeleting(false);

    if (!response.ok) {
      const { error } = await response.json();
      throw new Error(error.message);
    }

    setShowDeleteWebhookModal(false);
    router.push(`/${workspaceSlug}/settings/webhooks`);
  };

  if (!webhook) {
    return null;
  }

  return (
    <Modal
      showModal={showDeleteWebhookModal}
      setShowModal={setShowDeleteWebhookModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
        {logo ? (
          <BlurImage
            src={logo}
            alt="Workspace logo"
            className="h-10 w-10 rounded-full"
            width={20}
            height={20}
          />
        ) : (
          <Logo />
        )}
        <h3 className="text-lg font-medium">Delete {webhook.name}</h3>
        <p className="text-center text-sm text-gray-500">
          This will stop all events from being sent to the endpoint and remove
          all webhook logs
        </p>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();

          toast.promise(deleteWebhook(), {
            loading: "Deleting webhook...",
            success: "Webhook deleted successfully!",
            error: (err) => err,
          });
        }}
        className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16"
      >
        <div>
          <label htmlFor="verification" className="block text-sm text-gray-700">
            To verify, type{" "}
            <span className="font-semibold text-black">{webhook.name}</span>{" "}
            below
          </label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <input
              type="text"
              name="verification"
              id="verification"
              pattern={webhook.name}
              required
              autoFocus={false}
              autoComplete="off"
              className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
            />
          </div>
        </div>

        <Button
          text="Confirm delete"
          variant="danger"
          loading={deleting}
          autoFocus={!isMobile}
          type="submit"
        />
      </form>
    </Modal>
  );
}

export function useDeleteWebhookModal({
  webhook,
}: {
  webhook: Pick<WebhookProps, "id" | "name" | "url"> | undefined;
}) {
  const [showDeleteWebhookModal, setDeleteWebhookModal] = useState(false);

  const DeleteWebhookModalCallback = useCallback(() => {
    return (
      <DeleteWebhookModal
        showDeleteWebhookModal={showDeleteWebhookModal}
        setShowDeleteWebhookModal={setDeleteWebhookModal}
        webhook={webhook}
      />
    );
  }, [showDeleteWebhookModal, setDeleteWebhookModal, webhook]);

  return useMemo(
    () => ({
      setDeleteWebhookModal,
      DeleteWebhookModal: DeleteWebhookModalCallback,
    }),
    [setDeleteWebhookModal, DeleteWebhookModalCallback],
  );
}
