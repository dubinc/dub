import { Button, Copy, Modal, Tick, useCopyToClipboard } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

function TokenCreatedModal({
  showTokenCreatedModal,
  setShowTokenCreatedModal,
  token,
}: {
  showTokenCreatedModal: boolean;
  setShowTokenCreatedModal: Dispatch<SetStateAction<boolean>>;
  token: string;
}) {
  const [copied, copyToClipboard] = useCopyToClipboard();

  return (
    <Modal
      showModal={showTokenCreatedModal}
      setShowModal={setShowTokenCreatedModal}
      className="max-w-md"
    >
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">API Key Created</h3>
        <p className="text-sm text-neutral-500">
          For security reasons, we will only show you the key once. Please copy
          and store it somewhere safe.
        </p>
      </div>

      <div className="flex flex-col space-y-4 bg-neutral-50 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium text-neutral-800">API key</h2>
          <div className="flex items-center justify-between rounded-md border border-neutral-200 bg-white p-2">
            <p className="font-mono text-sm text-neutral-500">{token}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toast.promise(copyToClipboard(token), {
                  success: "Copied to clipboard!",
                });
              }}
              type="button"
              className="text-neutral-90 flex h-7 items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium hover:bg-neutral-50"
            >
              {copied ? (
                <Tick className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <Button text="Done" onClick={() => setShowTokenCreatedModal(false)} />
      </div>
    </Modal>
  );
}

export function useTokenCreatedModal({ token }: { token: string }) {
  const [showTokenCreatedModal, setShowTokenCreatedModal] = useState(false);

  const TokenCreatedModalCallback = useCallback(() => {
    return (
      <TokenCreatedModal
        showTokenCreatedModal={showTokenCreatedModal}
        setShowTokenCreatedModal={setShowTokenCreatedModal}
        token={token}
      />
    );
  }, [showTokenCreatedModal, setShowTokenCreatedModal]);

  return useMemo(
    () => ({
      setShowTokenCreatedModal,
      TokenCreatedModal: TokenCreatedModalCallback,
    }),
    [setShowTokenCreatedModal, TokenCreatedModalCallback],
  );
}
