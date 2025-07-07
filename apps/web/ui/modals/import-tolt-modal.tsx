import { setToltTokenAction } from "@/lib/actions/partners/set-tolt-token";
import { startToltImportAction } from "@/lib/actions/partners/start-tolt-import";
import useWorkspace from "@/lib/swr/use-workspace";
import { ToltProgram } from "@/lib/tolt/types";
import { Button, Logo, Modal, useMediaQuery, useRouterStuff } from "@dub/ui";
import { AnimatePresence, motion } from "framer-motion";
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

type Step = "set-token" | "program-info";

function ImportToltModal({
  showImportToltModal,
  setShowImportToltModal,
}: {
  showImportToltModal: boolean;
  setShowImportToltModal: Dispatch<SetStateAction<boolean>>;
}) {
  const searchParams = useSearchParams();
  const { queryParams } = useRouterStuff();
  const [step, setStep] = useState<Step>("set-token");
  const [toltProgram, setToltProgram] = useState<ToltProgram | null>(null);

  useEffect(() => {
    if (searchParams?.get("import") === "tolt") {
      setShowImportToltModal(true);
    } else {
      setShowImportToltModal(false);
    }
  }, [searchParams]);

  return (
    <Modal
      showModal={showImportToltModal}
      setShowModal={setShowImportToltModal}
      onClose={() =>
        queryParams({
          del: "import",
        })
      }
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-8 sm:px-16">
        <div className="flex items-center space-x-3 py-4">
          <img
            src="https://assets.dub.co/misc/icons/tolt.svg"
            alt="Tolt logo"
            className="h-10 w-10 rounded-full"
          />
          <ArrowRight className="h-5 w-5 text-neutral-600" />
          <Logo />
        </div>
        <h3 className="text-lg font-medium">Import Your Tolt Program</h3>
        <p className="text-center text-sm text-neutral-500">
          Import your existing Tolt program into{" "}
          {process.env.NEXT_PUBLIC_APP_NAME} with just a few clicks.
        </p>
      </div>

      <div className="flex flex-col space-y-6 bg-neutral-50 px-4 py-8 text-left sm:px-16">
        <AnimatePresence mode="wait">
          {step === "set-token" ? (
            <motion.div
              key="token-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <TokenForm setStep={setStep} setToltProgram={setToltProgram} />
            </motion.div>
          ) : (
            <motion.div
              key="program-info"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <ProgramInfo
                toltProgram={toltProgram!}
                onClose={() => {
                  setShowImportToltModal(false);
                  queryParams({
                    del: "import",
                  });
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}

function TokenForm({
  setStep,
  setToltProgram,
}: {
  setStep: Dispatch<SetStateAction<Step>>;
  setToltProgram: Dispatch<SetStateAction<ToltProgram | null>>;
}) {
  const { isMobile } = useMediaQuery();
  const { id: workspaceId } = useWorkspace();

  const [token, setToken] = useState("");
  const [toltProgramId, setToltProgramId] = useState("");

  const { executeAsync, isPending } = useAction(setToltTokenAction, {
    onSuccess: ({ data }) => {
      if (data?.program) {
        setToltProgram(data.program);
        setStep("program-info");
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!workspaceId || !token || !toltProgramId) {
      return;
    }

    await executeAsync({
      workspaceId,
      toltProgramId,
      token,
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col space-y-4">
      <div>
        <label
          htmlFor="token"
          className="block text-sm font-medium text-neutral-700"
        >
          Tolt API Key
        </label>
        <input
          type="password"
          id="token"
          value={token}
          autoFocus={!isMobile}
          onChange={(e) => setToken(e.target.value)}
          className="mt-1 block w-full rounded-md border border-neutral-200 px-3 py-2 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
          required
        />
        <p className="mt-1.5 text-xs text-neutral-500">
          You can find your Tolt API key on your{" "}
          <a
            href="https://app.tolt.io/settings?tab=integrations"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600"
          >
            Integrations tab
          </a>
        </p>
      </div>

      <div>
        <label
          htmlFor="programId"
          className="block text-sm font-medium text-neutral-700"
        >
          Tolt Program ID
        </label>
        <input
          type="text"
          id="programId"
          value={toltProgramId}
          onChange={(e) => setToltProgramId(e.target.value)}
          className="mt-1 block w-full rounded-md border border-neutral-200 px-3 py-2 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
          required
        />
        <p className="mt-1.5 text-xs text-neutral-500">
          You can find your program ID in your{" "}
          <a
            href="https://app.tolt.io/program-settings?page=general-settings"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600"
          >
            General settings tab
          </a>
        </p>
      </div>

      <Button
        text={isPending ? "Fetching program..." : "Fetch program"}
        loading={isPending}
        disabled={!token || !toltProgramId}
      />
    </form>
  );
}

function ProgramInfo({
  toltProgram,
  onClose,
}: {
  toltProgram: ToltProgram;
  onClose: () => void;
}) {
  const router = useRouter();
  const { id: workspaceId, slug } = useWorkspace();

  const { executeAsync, isPending } = useAction(startToltImportAction, {
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

    if (!workspaceId) {
      return;
    }

    await executeAsync({
      workspaceId,
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col space-y-6">
      <div>
        <h4 className="mb-3 text-sm font-medium text-neutral-700">
          Program Information
        </h4>
        <dl className="grid grid-cols-2 gap-3 rounded-md border border-neutral-200 bg-white p-4 text-xs">
          <div>
            <dt className="text-neutral-500">Name</dt>
            <dd className="font-medium text-neutral-700">{toltProgram.name}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Subdomain</dt>
            <dd className="font-medium text-neutral-700">
              {toltProgram.subdomain}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Payout Term</dt>
            <dd className="font-medium text-neutral-700">
              {toltProgram.payout_term} days
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Total Partners</dt>
            <dd className="font-medium text-neutral-700">
              {toltProgram.affiliates?.toLocaleString() || "0"}
            </dd>
          </div>
        </dl>
      </div>

      <Button
        text="Import program"
        disabled={!toltProgram || toltProgram.affiliates === 0}
        loading={isPending}
        className="w-full justify-center"
      />
    </form>
  );
}

export function useImportToltModal() {
  const [showImportToltModal, setShowImportToltModal] = useState(false);

  const ImportToltModalCallback = useCallback(() => {
    return (
      <ImportToltModal
        showImportToltModal={showImportToltModal}
        setShowImportToltModal={setShowImportToltModal}
      />
    );
  }, [showImportToltModal, setShowImportToltModal]);

  return useMemo(
    () => ({
      setShowImportToltModal,
      ImportToltModal: ImportToltModalCallback,
    }),
    [setShowImportToltModal, ImportToltModalCallback],
  );
}
