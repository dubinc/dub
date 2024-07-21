import useWorkspace from "@/lib/swr/use-workspace";
import { OAuthAppProps } from "@/lib/types";
import { Button, Logo, Modal, useMediaQuery } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { mutate } from "swr";

interface DeleteAppModalProps {
  showDeleteAppModal: boolean;
  setShowDeleteAppModal: Dispatch<SetStateAction<boolean>>;
  app: Pick<OAuthAppProps, "name" | "clientId">;
  appType: "published" | "authorized";
}

function DeleteAppModal(props: DeleteAppModalProps) {
  const { showDeleteAppModal, setShowDeleteAppModal, app, appType } = props;

  const { isMobile } = useMediaQuery();
  const { id: workspaceId } = useWorkspace();
  const [deleting, setDeleting] = useState(false);

  const action = useMemo(() => {
    if (appType === "authorized") {
      return {
        url: `/api/integrations/${app.clientId}/uninstall?workspaceId=${workspaceId}`,
        mutate: `/api/integrations/installations?workspaceId=${workspaceId}`,
        message: "Successfully uninstalled the application!",
        title: `Uninstall ${app.name}`,
        description: `This will uninstall the application from your workspace. Are you sure you want to continue?`,
      };
    } else {
      return {
        url: `/api/integrations/${app.clientId}?workspaceId=${workspaceId}`,
        mutate: `/api/integrations?workspaceId=${workspaceId}`,
        message: "Successfully deleted the application!",
        title: `Delete ${app.name}`,
        description: `This will permanently delete the application and revoke all the access tokens associated with it. Are you sure you want to continue?`,
      };
    }
  }, [app.clientId, appType, workspaceId]);

  const deleteApp = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setDeleting(true);

      const response = await fetch(action.url, { method: "DELETE" });
      const result = await response.json();

      if (response.ok) {
        mutate(action.mutate);
        toast.success(action.message);
        setShowDeleteAppModal(false);
      } else {
        toast.error(result.error.message);
      }

      setDeleting(false);
    },
    [app.clientId, setShowDeleteAppModal],
  );

  return (
    <Modal showModal={showDeleteAppModal} setShowModal={setShowDeleteAppModal}>
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 text-center sm:px-16">
        <Logo />
        <h3 className="text-lg font-medium">{action.title}</h3>
        <p className="text-sm text-gray-500">{action.description}</p>
      </div>
      <form
        onSubmit={deleteApp}
        className="flex flex-col space-y-3 bg-gray-50 px-4 py-8 text-left sm:px-16"
      >
        <div>
          <label htmlFor="verification" className="block text-sm text-gray-700">
            To verify, type <span className="font-semibold">{app.name}</span>{" "}
            below
          </label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <input
              type="text"
              name="verification"
              id="verification"
              pattern={app.name}
              required
              autoFocus={!isMobile}
              autoComplete="off"
              className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
            />
          </div>
        </div>
        <Button variant="danger" text="Confirm delete" loading={deleting} />
      </form>
    </Modal>
  );
}

export function useDeleteAppModal({
  app,
  appType,
}: {
  app: Pick<OAuthAppProps, "name" | "clientId">;
  appType: "published" | "authorized";
}) {
  const [showDeleteAppModal, setShowDeleteAppModal] = useState(false);

  const DeleteAppModalCallback = useCallback(() => {
    return app ? (
      <DeleteAppModal
        showDeleteAppModal={showDeleteAppModal}
        setShowDeleteAppModal={setShowDeleteAppModal}
        app={app}
        appType={appType}
      />
    ) : null;
  }, [showDeleteAppModal, setShowDeleteAppModal]);

  return useMemo(
    () => ({
      setShowDeleteAppModal,
      DeleteAppModal: DeleteAppModalCallback,
    }),
    [setShowDeleteAppModal, DeleteAppModalCallback],
  );
}
