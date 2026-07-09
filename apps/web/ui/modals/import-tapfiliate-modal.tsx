import { setTapfiliateTokenAction } from "@/lib/actions/partners/set-tapfiliate-token";
import { startTapfiliateImportAction } from "@/lib/actions/partners/start-tapfiliate-import";
import useWorkspace from "@/lib/swr/use-workspace";
import { TapfiliateProgram } from "@/lib/tapfiliate/types";
import {
  Button,
  Check2,
  Logo,
  Modal,
  ScrollContainer,
  useMediaQuery,
  useRouterStuff,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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
import { MarkdownDescription } from "../shared/markdown-description";

type Step = "set-token" | "select-program";

function ImportTapfiliateModal({
  showImportTapfiliateModal,
  setShowImportTapfiliateModal,
}: {
  showImportTapfiliateModal: boolean;
  setShowImportTapfiliateModal: Dispatch<SetStateAction<boolean>>;
}) {
  const searchParams = useSearchParams();
  const { queryParams } = useRouterStuff();
  const [step, setStep] = useState<Step>("set-token");
  const [programs, setPrograms] = useState<TapfiliateProgram[]>([]);

  useEffect(() => {
    if (searchParams?.get("import") === "tapfiliate") {
      setShowImportTapfiliateModal(true);
    } else {
      setShowImportTapfiliateModal(false);
    }
  }, [searchParams]);

  // Reset the step and programs when the modal is closed
  useEffect(() => {
    if (!showImportTapfiliateModal) {
      setStep("set-token");
      setPrograms([]);
    }
  }, [showImportTapfiliateModal]);

  return (
    <Modal
      showModal={showImportTapfiliateModal}
      setShowModal={setShowImportTapfiliateModal}
      onClose={() =>
        queryParams({
          del: "import",
        })
      }
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-8 sm:px-16">
        <div className="flex items-center space-x-3 py-4">
          <img
            src="https://assets.dub.co/misc/icons/tapfiliate.svg"
            alt="Tapfiliate logo"
            className="h-10 w-10 rounded-full"
          />
          <ArrowRight className="h-5 w-5 text-neutral-600" />
          <Logo />
        </div>
        <h3 className="text-lg font-medium">Import your Tapfiliate program</h3>
        <MarkdownDescription className="text-center text-sm text-neutral-500">
          [Migrate your existing Tapfiliate
          program](https://dub.co/help/article/migrating-from-tapfiliate),
          partners, and historical stats into Dub in just a few clicks.
        </MarkdownDescription>
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
              <TokenForm setStep={setStep} setPrograms={setPrograms} />
            </motion.div>
          ) : (
            <motion.div
              key="select-program"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <SelectProgram
                programs={programs}
                onClose={() => {
                  setShowImportTapfiliateModal(false);
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
  setPrograms,
}: {
  setStep: Dispatch<SetStateAction<Step>>;
  setPrograms: Dispatch<SetStateAction<TapfiliateProgram[]>>;
}) {
  const { isMobile } = useMediaQuery();
  const { id: workspaceId } = useWorkspace();

  const [apiKey, setApiKey] = useState("");

  const { executeAsync, isPending } = useAction(setTapfiliateTokenAction, {
    onSuccess: ({ data }) => {
      if (data?.programs) {
        setPrograms(data.programs);
        setStep("select-program");
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!workspaceId || !apiKey) {
      return;
    }

    await executeAsync({
      workspaceId,
      apiKey,
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col space-y-4">
      <div>
        <label
          htmlFor="apiKey"
          className="block text-sm font-medium text-neutral-700"
        >
          Tapfiliate API Key
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
          You can find your API key in your{" "}
          <a
            href="https://support.tapfiliate.com/en/articles/12793297-how-to-find-account-id-and-api-key"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600"
          >
            Profile settings
          </a>
        </p>
      </div>

      <Button
        text={isPending ? "Fetching programs..." : "Fetch programs"}
        loading={isPending}
        disabled={!apiKey}
      />
    </form>
  );
}

function SelectProgram({
  programs,
  onClose,
}: {
  programs: TapfiliateProgram[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { id: workspaceId, slug } = useWorkspace();

  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(
    programs.length === 1 ? programs[0].id : null,
  );

  const { executeAsync, isPending } = useAction(startTapfiliateImportAction, {
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

    if (!workspaceId || !selectedProgramId) {
      return;
    }

    await executeAsync({
      workspaceId,
      tapfiliateProgramId: selectedProgramId,
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col space-y-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-700">
          Choose a program to import
        </label>

        <ScrollContainer className="max-h-[280px] rounded-lg border border-neutral-200 bg-white">
          <div className="flex w-full flex-col gap-1 p-1">
            {programs.map((program) => {
              const checked = selectedProgramId === program.id;

              return (
                <button
                  key={program.id}
                  type="button"
                  onClick={() => setSelectedProgramId(program.id)}
                  className={cn(
                    "flex cursor-pointer select-none items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-neutral-700",
                    "hover:bg-neutral-100",
                    checked && "bg-neutral-100",
                  )}
                >
                  <div
                    className={cn(
                      "border-border-emphasis flex size-4 shrink-0 items-center justify-center rounded-full border bg-white transition-colors duration-75",
                      checked && "border-neutral-900 bg-neutral-900",
                    )}
                  >
                    <Check2
                      className={cn(
                        "size-2.5 text-white transition-[transform,opacity] duration-75",
                        !checked && "scale-75 opacity-0",
                      )}
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="min-w-0 truncate font-medium">
                      {program.title}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {program.id}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollContainer>
      </div>

      <Button
        text="Import program"
        disabled={!selectedProgramId}
        loading={isPending}
        className="w-full justify-center"
      />
    </form>
  );
}

export function useImportTapfiliateModal() {
  const [showImportTapfiliateModal, setShowImportTapfiliateModal] =
    useState(false);

  const ImportTapfiliateModalCallback = useCallback(() => {
    return (
      <ImportTapfiliateModal
        showImportTapfiliateModal={showImportTapfiliateModal}
        setShowImportTapfiliateModal={setShowImportTapfiliateModal}
      />
    );
  }, [showImportTapfiliateModal, setShowImportTapfiliateModal]);

  return useMemo(
    () => ({
      setShowImportTapfiliateModal,
      ImportTapfiliateModal: ImportTapfiliateModalCallback,
    }),
    [setShowImportTapfiliateModal, ImportTapfiliateModalCallback],
  );
}
