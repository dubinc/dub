import { OAuthAppProps } from "@/lib/types";
import { Button, CopyButton, Logo, Modal } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";

function AppCreatedModal({
  showAppCreatedModal,
  setShowAppCreatedModal,
  app,
}: {
  showAppCreatedModal: boolean;
  setShowAppCreatedModal: Dispatch<SetStateAction<boolean>>;
  app: OAuthAppProps | null;
}) {
  if (!app) {
    return null;
  }

  console.log("AppCreatedModal rendered", app);

  return (
    <Modal
      showModal={showAppCreatedModal}
      setShowModal={setShowAppCreatedModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
        <Logo />
        <h3 className="text-lg font-medium">{app.name}</h3>
        <p className="text-center text-sm text-gray-500">
          Be sure to copy your client secret. You won’t be able to see it again.
        </p>
      </div>

      <div className="flex flex-col space-y-4 bg-gray-50 px-4 py-8 text-left sm:px-10">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-500">Client ID</label>
          <div className="flex items-center justify-between rounded-md border border-gray-300 bg-white p-3">
            <p className="font-mono text-sm text-gray-500">{app.clientId}</p>
            <div className="flex flex-col gap-2">
              <CopyButton value={app.clientId} className="rounded-md" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-500">
            Client Secret
          </label>
          <div className="flex items-center justify-between rounded-md border border-gray-300 bg-white p-3">
            <p className="font-mono text-sm text-gray-500 text-nowrap">
              {app.clientSecret}
            </p>
            <div className="flex flex-col gap-2">
              <CopyButton value={app.clientSecret!} className="rounded-md" />
            </div>
          </div>
        </div>

        <Button
          text="Done"
          variant="secondary"
          onClick={() => setShowAppCreatedModal(false)}
        />
      </div>
    </Modal>
  );
}

export function useAppCreatedModal({ app }: { app: OAuthAppProps | null }) {
  const [showAppCreatedModal, setShowAppCreatedModal] = useState(false);

  const AppCreatedModalCallback = useCallback(() => {
    return (
      <AppCreatedModal
        showAppCreatedModal={showAppCreatedModal}
        setShowAppCreatedModal={setShowAppCreatedModal}
        app={app}
      />
    );
  }, [showAppCreatedModal, setShowAppCreatedModal]);

  return useMemo(
    () => ({
      setShowAppCreatedModal,
      AppCreatedModal: AppCreatedModalCallback,
    }),
    [setShowAppCreatedModal, AppCreatedModalCallback],
  );
}
