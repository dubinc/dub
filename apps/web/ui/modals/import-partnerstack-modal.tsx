import { startPartnerStackImportAction } from "@/lib/actions/partners/start-partnerstack-import";
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
  useState,
} from "react";
import { toast } from "sonner";

function ImportPartnerStackModal({
  showImportPartnerStackModal,
  setShowImportPartnerStackModal,
}: {
  showImportPartnerStackModal: boolean;
  setShowImportPartnerStackModal: Dispatch<SetStateAction<boolean>>;
}) {
  const searchParams = useSearchParams();
  const { queryParams } = useRouterStuff();

  useEffect(() => {
    if (searchParams?.get("import") === "partnerstack") {
      setShowImportPartnerStackModal(true);
    } else {
      setShowImportPartnerStackModal(false);
    }
  }, [searchParams]);

  return (
    <Modal
      showModal={showImportPartnerStackModal}
      setShowModal={setShowImportPartnerStackModal}
      onClose={() =>
        queryParams({
          del: "import",
        })
      }
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-8 sm:px-16">
        <div className="flex items-center space-x-3 py-4">
          <img
            src="https://assets.dub.co/misc/icons/partnerstack.svg"
            alt="PartnerStack logo"
            className="h-10 w-10 rounded-full"
          />
          <ArrowRight className="h-5 w-5 text-neutral-600" />
          <Logo />
        </div>
        <h3 className="text-lg font-medium">
          Import Your PartnerStack Program
        </h3>
        <p className="text-center text-sm text-neutral-500">
          Import your existing PartnerStack program into{" "}
          {process.env.NEXT_PUBLIC_APP_NAME} with just a few clicks.
        </p>
      </div>

      <div className="flex flex-col space-y-6 bg-neutral-50 px-4 py-8 text-left sm:px-16">
        <TokenForm
          onClose={() => {
            setShowImportPartnerStackModal(false);
            queryParams({
              del: "import",
            });
          }}
        />
      </div>
    </Modal>
  );
}

function TokenForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { isMobile } = useMediaQuery();
  const [publicKey, setPublicKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const { id: workspaceId, slug } = useWorkspace();

  const { executeAsync, isPending } = useAction(startPartnerStackImportAction, {
    onSuccess: () => {
      onClose();
      toast.success(
        "Successfully added program to import queue! We will send you an email when your program has been fully imported.",
      );
      router.push(`/${slug}/program/partners`);
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!workspaceId || !publicKey || !secretKey) {
      toast.error("Please fill in all required fields.");
      return;
    }

    await executeAsync({
      workspaceId,
      publicKey,
      secretKey,
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col space-y-4">
      <div>
        <label
          htmlFor="publicKey"
          className="block text-sm font-medium text-neutral-700"
        >
          PartnerStack Public Key
        </label>
        <input
          type="password"
          id="publicKey"
          value={publicKey}
          autoFocus={!isMobile}
          onChange={(e) => setPublicKey(e.target.value)}
          className="mt-1 block w-full rounded-md border border-neutral-200 px-3 py-2 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
          required
        />
        <p className="mt-1.5 text-xs text-neutral-500">
          You can find your PartnerStack API key in your{" "}
          <a
            href="https://app.partnerstack.com/settings/integrations"
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
          htmlFor="secretKey"
          className="block text-sm font-medium text-neutral-700"
        >
          PartnerStack Secret Key
        </label>
        <input
          type="password"
          id="secretKey"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          className="mt-1 block w-full rounded-md border border-neutral-200 px-3 py-2 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
          required
        />
      </div>

      <Button
        text={isPending ? "Starting import..." : "Start Import"}
        loading={isPending}
        disabled={!publicKey || !secretKey}
      />
    </form>
  );
}

export function useImportPartnerStackModal() {
  const [showImportPartnerStackModal, setShowImportPartnerStackModal] =
    useState(false);

  const ImportPartnerStackModalCallback = useCallback(
    () => (
      <ImportPartnerStackModal
        showImportPartnerStackModal={showImportPartnerStackModal}
        setShowImportPartnerStackModal={setShowImportPartnerStackModal}
      />
    ),
    [showImportPartnerStackModal],
  );

  return {
    showImportPartnerStackModal,
    setShowImportPartnerStackModal,
    ImportPartnerStackModal: ImportPartnerStackModalCallback,
  };
}
