import { startFirstPromoterImportAction } from "@/lib/actions/partners/start-firstpromoter-import";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, Logo, Modal, useMediaQuery, useRouterStuff } from "@dub/ui";
import { ArrowRight } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

function ImportFirstPromoterModal({
  showImportFirstPromoterModal,
  setShowImportFirstPromoterModal,
}: {
  showImportFirstPromoterModal: boolean;
  setShowImportFirstPromoterModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { queryParams } = useRouterStuff();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams?.get("import") === "firstpromoter") {
      setShowImportFirstPromoterModal(true);
    } else {
      setShowImportFirstPromoterModal(false);
    }
  }, [searchParams]);

  return (
    <Modal
      showModal={showImportFirstPromoterModal}
      setShowModal={setShowImportFirstPromoterModal}
      onClose={() => queryParams({ del: "import" })}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-8 sm:px-16">
        <div className="flex items-center space-x-3 py-4">
          <img
            src="https://assets.dub.co/misc/icons/firstpromoter.svg"
            alt="FirstPromoter logo"
            className="h-10 w-10 rounded-full"
          />
          <ArrowRight className="h-5 w-5 text-neutral-600" />
          <Logo />
        </div>
        <h3 className="text-lg font-medium">
          Import Your FirstPromoter Campaign
        </h3>
        <p className="text-center text-sm text-neutral-500">
          Import your existing FirstPromoter campaign into{" "}
          {process.env.NEXT_PUBLIC_APP_NAME}.
        </p>
      </div>

      <div className="flex flex-col space-y-6 bg-neutral-50 px-4 py-8 text-left sm:px-16">
        <CredentialsForm
          onClose={() => {
            setShowImportFirstPromoterModal(false);
            queryParams({
              del: "import",
            });
          }}
        />
      </div>
    </Modal>
  );
}

function CredentialsForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { isMobile } = useMediaQuery();
  const { id: workspaceId, slug } = useWorkspace();

  const [apiKey, setApiKey] = useState("");
  const [accountId, setAccountId] = useState("");

  const { executeAsync: startImport, isPending: isStartingImport } = useAction(
    startFirstPromoterImportAction,
    {
      onSuccess: () => {
        onClose();
        toast.success(
          "Successfully started FirstPromoter import. We'll email you when it's complete.",
        );
        router.push(`/${slug}/program/partners`);
      },
      onError: ({ error }) => toast.error(error.serverError),
    },
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!workspaceId || !apiKey || !accountId) {
      return;
    }

    await startImport({
      workspaceId,
      apiKey,
      accountId,
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col space-y-4">
      <div>
        <label
          htmlFor="apiKey"
          className="block text-sm font-medium text-neutral-700"
        >
          FirstPromoter API Key
        </label>
        <input
          type="password"
          id="apiKey"
          value={apiKey}
          autoFocus={!isMobile}
          onChange={(e) => setApiKey(e.target.value)}
          className="mt-1 block w-full rounded-md border border-neutral-200 px-3 py-2 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
          required
        />
        <p className="mt-1.5 text-xs text-neutral-500">
          Find your FirstPromoter API key in{" "}
          <a
            href="https://app.firstpromoter.com/settings/integrations"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600"
          >
            Settings
          </a>
        </p>
      </div>
      <div>
        <label
          htmlFor="accountId"
          className="block text-sm font-medium text-neutral-700"
        >
          FirstPromoter Account ID
        </label>
        <input
          type="text"
          id="accountId"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="mt-1 block w-full rounded-md border border-neutral-200 px-3 py-2 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
          required
        />
        <p className="mt-1.5 text-xs text-neutral-500">
          Find your FirstPromoter Account ID in{" "}
          <a
            href="https://app.firstpromoter.com/settings/integrations"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600"
          >
            Settings
          </a>
        </p>
      </div>
      <Button
        text={isStartingImport ? "Starting import..." : "Start Import"}
        loading={isStartingImport}
        disabled={!apiKey || !accountId || !workspaceId}
      />
    </form>
  );
}

export function useImportFirstPromoterModal() {
  const [showImportFirstPromoterModal, setShowImportFirstPromoterModal] =
    useState(false);

  const ImportFirstPromoterModalCallback = useCallback(() => {
    return (
      <ImportFirstPromoterModal
        showImportFirstPromoterModal={showImportFirstPromoterModal}
        setShowImportFirstPromoterModal={setShowImportFirstPromoterModal}
      />
    );
  }, [showImportFirstPromoterModal, setShowImportFirstPromoterModal]);

  return useMemo(
    () => ({
      setShowImportFirstPromoterModal,
      ImportFirstPromoterModal: ImportFirstPromoterModalCallback,
    }),
    [setShowImportFirstPromoterModal, ImportFirstPromoterModalCallback],
  );
}
