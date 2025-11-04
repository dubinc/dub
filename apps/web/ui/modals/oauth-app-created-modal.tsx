import useWorkspace from "@/lib/swr/use-workspace";
import { OAuthAppWithClientSecret } from "@/lib/types";
import { Button, Copy, Modal, Tick, useCopyToClipboard } from "@dub/ui";
import { useRouter } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

interface OAuthAppCreatedModalProps {
  showOAuthAppCreatedModal: boolean;
  setShowOAuthAppCreatedModal: Dispatch<SetStateAction<boolean>>;
  oAuthApp: OAuthAppWithClientSecret | null;
}

function OAuthAppCreatedModal({
  showOAuthAppCreatedModal,
  setShowOAuthAppCreatedModal,
  oAuthApp,
}: OAuthAppCreatedModalProps) {
  const router = useRouter();
  const { slug } = useWorkspace();
  const [copied, copyToClipboard] = useCopyToClipboard();
  const [copiedField, setCopiedField] = useState<"id" | "secret" | null>(null);

  if (!oAuthApp) {
    return null;
  }

  return (
    <Modal
      showModal={showOAuthAppCreatedModal}
      setShowModal={setShowOAuthAppCreatedModal}
      className="max-w-md"
    >
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">OAuth App Created</h3>
        <p className="text-sm text-neutral-500">
          For security reasons, we will only show you the client secret once.
          Please copy and store it somewhere safe.
        </p>
      </div>

      <div className="flex flex-col space-y-4 bg-neutral-50 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium text-neutral-800">Client ID</h2>
          <div className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 bg-white p-2">
            <p className="truncate font-mono text-sm text-neutral-500">
              {oAuthApp.clientId}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCopiedField("id");
                toast.promise(copyToClipboard(oAuthApp.clientId), {
                  success: "Client ID copied to clipboard!",
                });
              }}
              type="button"
              className="text-neutral-90 flex h-7 shrink-0 items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium hover:bg-neutral-50"
            >
              {copied && copiedField === "id" ? (
                <Tick className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied && copiedField === "id" ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium text-neutral-800">
            Client Secret
          </h2>
          <div className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 bg-white p-2">
            <p className="truncate font-mono text-sm text-neutral-500">
              {oAuthApp.clientSecret}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCopiedField("secret");
                toast.promise(copyToClipboard(oAuthApp.clientSecret), {
                  success: "Client Secret copied to clipboard!",
                });
              }}
              type="button"
              className="text-neutral-90 flex h-7 shrink-0 items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium hover:bg-neutral-50"
            >
              {copied && copiedField === "secret" ? (
                <Tick className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied && copiedField === "secret" ? "Copied" : "Copy"}
            </button>
          </div>
          <span className="text-xs text-red-600">
            Be sure to copy your client secret. You won't be able to see it
            again.
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            text="Close"
            variant="secondary"
            onClick={() => {
              router.push(`/${slug}/settings/oauth-apps`);
            }}
            className="flex-1"
          />
          <Button
            text="Go to OAuth App"
            onClick={() => {
              router.push(`/${slug}/settings/oauth-apps/${oAuthApp.id}`);
            }}
            className="flex-1"
          />
        </div>
      </div>
    </Modal>
  );
}

export function useOAuthAppCreatedModal({
  oAuthApp,
}: {
  oAuthApp: OAuthAppWithClientSecret | null;
}) {
  const [showOAuthAppCreatedModal, setShowOAuthAppCreatedModal] =
    useState(false);

  const OAuthAppCreatedModalCallback = useCallback(() => {
    return (
      <OAuthAppCreatedModal
        showOAuthAppCreatedModal={showOAuthAppCreatedModal}
        setShowOAuthAppCreatedModal={setShowOAuthAppCreatedModal}
        oAuthApp={oAuthApp}
      />
    );
  }, [showOAuthAppCreatedModal, setShowOAuthAppCreatedModal, oAuthApp]);

  return useMemo(
    () => ({
      setShowOAuthAppCreatedModal,
      OAuthAppCreatedModal: OAuthAppCreatedModalCallback,
    }),
    [setShowOAuthAppCreatedModal, OAuthAppCreatedModalCallback],
  );
}
