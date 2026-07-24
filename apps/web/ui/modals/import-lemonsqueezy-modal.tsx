import { setLemonSqueezyTokenAction } from "@/lib/actions/partners/set-lemonsqueezy-token";
import { startLemonSqueezyImportAction } from "@/lib/actions/partners/start-lemonsqueezy-import";
import { LemonSqueezyStore } from "@/lib/lemonsqueezy/types";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  Button,
  Check2,
  Logo,
  Modal,
  ScrollContainer,
  useMediaQuery,
  useRouterStuff,
} from "@dub/ui";
import { cn, nFormatter } from "@dub/utils";
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

type Step = "set-token" | "select-store";

function ImportLemonSqueezyModal({
  showImportLemonSqueezyModal,
  setShowImportLemonSqueezyModal,
}: {
  showImportLemonSqueezyModal: boolean;
  setShowImportLemonSqueezyModal: Dispatch<SetStateAction<boolean>>;
}) {
  const searchParams = useSearchParams();
  const { queryParams } = useRouterStuff();
  const [step, setStep] = useState<Step>("set-token");
  const [stores, setStores] = useState<LemonSqueezyStore[]>([]);

  useEffect(() => {
    if (searchParams?.get("import") === "lemonsqueezy") {
      setShowImportLemonSqueezyModal(true);
    } else {
      setShowImportLemonSqueezyModal(false);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!showImportLemonSqueezyModal) {
      setStep("set-token");
      setStores([]);
    }
  }, [showImportLemonSqueezyModal]);

  return (
    <Modal
      showModal={showImportLemonSqueezyModal}
      setShowModal={setShowImportLemonSqueezyModal}
      onClose={() =>
        queryParams({
          del: "import",
        })
      }
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-8 sm:px-16">
        <div className="flex items-center space-x-3 py-4">
          <img
            src="https://assets.dub.co/misc/icons/lemonsqueezy.svg"
            alt="Lemon Squeezy logo"
            className="h-10 w-10"
          />
          <ArrowRight className="h-5 w-5 text-neutral-600" />
          <Logo />
        </div>
        <h3 className="text-lg font-medium">
          Import your Lemon Squeezy program
        </h3>
        <MarkdownDescription className="text-center text-sm text-neutral-500">
          [Migrate your existing Lemon Squeezy
          program](https://dub.co/help/article/migrating-from-lemonsqueezy),
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
              <TokenForm setStep={setStep} setStores={setStores} />
            </motion.div>
          ) : (
            <motion.div
              key="select-store"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <SelectStore
                stores={stores}
                onClose={() => {
                  setShowImportLemonSqueezyModal(false);
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
  setStores,
}: {
  setStep: Dispatch<SetStateAction<Step>>;
  setStores: Dispatch<SetStateAction<LemonSqueezyStore[]>>;
}) {
  const { isMobile } = useMediaQuery();
  const { id: workspaceId } = useWorkspace();

  const [apiKey, setApiKey] = useState("");

  const { executeAsync, isPending } = useAction(setLemonSqueezyTokenAction, {
    onSuccess: ({ data }) => {
      if (data?.stores) {
        setStores(data.stores);
        setStep("select-store");
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
          Lemon Squeezy API Key
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
          You can create an API key in your{" "}
          <a
            href="https://app.lemonsqueezy.com/settings/api"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600"
          >
            Lemon Squeezy settings
          </a>
          . Use a live-mode key for production migrations.
        </p>
      </div>

      <Button
        text={isPending ? "Fetching stores..." : "Fetch stores"}
        loading={isPending}
        disabled={!apiKey}
      />
    </form>
  );
}

function SelectStore({
  stores,
  onClose,
}: {
  stores: LemonSqueezyStore[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { id: workspaceId, slug } = useWorkspace();

  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(
    stores.length === 1 ? stores[0].id : null,
  );

  const { executeAsync, isPending } = useAction(startLemonSqueezyImportAction, {
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

    if (!workspaceId || !selectedStoreId) {
      return;
    }

    await executeAsync({
      workspaceId,
      storeId: selectedStoreId,
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col space-y-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-700">
          Choose a store to import
        </label>

        <ScrollContainer className="max-h-[280px] rounded-lg border border-neutral-200 bg-white">
          <div className="flex w-full flex-col gap-1 p-1">
            {stores.map((store) => {
              const checked = selectedStoreId === store.id;

              return (
                <button
                  key={store.id}
                  type="button"
                  onClick={() => setSelectedStoreId(store.id)}
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
                      {store.name}
                    </span>
                    <span className="truncate text-xs text-neutral-500">
                      {store.domain || store.url}
                      {store.total_sales != null
                        ? ` · ${nFormatter(store.total_sales, { full: true })} sales`
                        : ""}
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
        disabled={!selectedStoreId}
        loading={isPending}
        className="w-full justify-center"
      />
    </form>
  );
}

export function useImportLemonSqueezyModal() {
  const [showImportLemonSqueezyModal, setShowImportLemonSqueezyModal] =
    useState(false);

  const ImportLemonSqueezyModalCallback = useCallback(() => {
    return (
      <ImportLemonSqueezyModal
        showImportLemonSqueezyModal={showImportLemonSqueezyModal}
        setShowImportLemonSqueezyModal={setShowImportLemonSqueezyModal}
      />
    );
  }, [showImportLemonSqueezyModal, setShowImportLemonSqueezyModal]);

  return useMemo(
    () => ({
      setShowImportLemonSqueezyModal,
      ImportLemonSqueezyModal: ImportLemonSqueezyModalCallback,
    }),
    [setShowImportLemonSqueezyModal, ImportLemonSqueezyModalCallback],
  );
}
