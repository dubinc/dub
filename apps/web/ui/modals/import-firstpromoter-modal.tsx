import { setFirstPromoterTokenAction } from "@/lib/actions/partners/set-firstpromoter-token";
import { startFirstPromoterImportAction } from "@/lib/actions/partners/start-firstpromoter-import";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  Button,
  LoadingSpinner,
  Logo,
  Modal,
  useMediaQuery,
  useRouterStuff,
} from "@dub/ui";
import { fetcher } from "@dub/utils";
import { ArrowRight, ServerOff } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import useSWRImmutable from "swr/immutable";

type Campaign = { id: string; name: string };

function ImportFirstPromoterModal({
  showImportFirstPromoterModal,
  setShowImportFirstPromoterModal,
}: {
  showImportFirstPromoterModal: boolean;
  setShowImportFirstPromoterModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { slug } = useParams() as { slug?: string };

  const router = useRouter();
  const { queryParams } = useRouterStuff();
  const searchParams = useSearchParams();

  const { program } = useProgram();
  const { id: workspaceId } = useWorkspace();

  const [apiKey, setApiKey] = useState("");
  const [accountId, setAccountId] = useState("");
  const [step, setStep] = useState<"token" | "campaigns">("token");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null,
  );

  useEffect(() => {
    if (searchParams?.get("import") === "firstpromoter") {
      setShowImportFirstPromoterModal(true);
    } else {
      setShowImportFirstPromoterModal(false);
    }
  }, [searchParams]);

  const { executeAsync: setCredentials, isPending: isSettingToken } = useAction(
    setFirstPromoterTokenAction,
    {
      onError: ({ error }) => toast.error(error.serverError),
      onSuccess: () => {
        setStep("campaigns");
        mutate();
      },
    },
  );

  const { executeAsync: startImport, isPending: isStartingImport } = useAction(
    startFirstPromoterImportAction,
    {
      onError: ({ error }) => toast.error(error.serverError),
      onSuccess: () => {
        toast.success(
          "Successfully added campaign to import queue! We will send you an email when your campaign has been fully imported.",
        );
        router.push(`/${slug}/program/partners`);
      },
    },
  );

  const {
    data: campaigns,
    isLoading: isLoadingCampaigns,
    mutate,
  } = useSWRImmutable<Campaign[]>(
    showImportFirstPromoterModal &&
      program?.id &&
      workspaceId &&
      step === "campaigns"
      ? `/api/programs/firstpromoter/campaigns?workspaceId=${workspaceId}`
      : null,
    fetcher,
  );

  const onSubmitToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !apiKey || !accountId) return;
    await setCredentials({ workspaceId, apiKey, accountId });
  };

  const onSubmitCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !program?.id || !selectedCampaign) return;
    await startImport({ workspaceId, campaignId: selectedCampaign.id });
  };

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
        {step === "token" ? (
          <TokenStep
            apiKey={apiKey}
            setApiKey={setApiKey}
            accountId={accountId}
            setAccountId={setAccountId}
            submitting={isSettingToken}
            onSubmit={onSubmitToken}
          />
        ) : isLoadingCampaigns || !workspaceId ? (
          <div className="flex flex-col items-center justify-center space-y-4 bg-none">
            <LoadingSpinner />
            <p className="text-sm text-neutral-500">Loading campaigns...</p>
          </div>
        ) : campaigns ? (
          <CampaignStep
            campaigns={campaigns}
            selectedCampaign={selectedCampaign}
            setSelectedCampaign={setSelectedCampaign}
            importing={isStartingImport}
            onSubmit={onSubmitCampaign}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 pb-2">
            <ServerOff className="h-6 w-6 text-neutral-500" />
            <p className="text-center text-sm text-neutral-500">
              Failed to load campaigns. Please try again.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function TokenStep({
  apiKey,
  setApiKey,
  accountId,
  setAccountId,
  submitting,
  onSubmit,
}: {
  apiKey: string;
  setApiKey: (v: string) => void;
  accountId: string;
  setAccountId: (v: string) => void;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}) {
  const { isMobile } = useMediaQuery();
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
          placeholder="Enter your FirstPromoter API key"
          className="mt-1 block w-full rounded-md border border-neutral-200 px-3 py-2 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
          required
        />
        <p className="mt-1.5 text-xs text-neutral-500">
          Find your FirstPromoter API key in{" "}
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
          placeholder="Enter your FirstPromoter Account ID"
          className="mt-1 block w-full rounded-md border border-neutral-200 px-3 py-2 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
          required
        />
        <p className="mt-1.5 text-xs text-neutral-500">
          Find your FirstPromoter Account ID in{" "}
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
      <Button
        text={submitting ? "Fetching campaigns..." : "Fetch campaigns"}
        loading={submitting}
        disabled={!apiKey || !accountId}
      />
    </form>
  );
}

function CampaignStep({
  campaigns,
  selectedCampaign,
  setSelectedCampaign,
  importing,
  onSubmit,
}: {
  campaigns: Campaign[];
  selectedCampaign: Campaign | null;
  setSelectedCampaign: (c: Campaign | null) => void;
  importing: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const c = campaigns.find((x) => x.id === e.target.value) || null;
      setSelectedCampaign(c);
    },
    [campaigns, setSelectedCampaign],
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-col space-y-6">
      <div>
        <label
          htmlFor="campaign"
          className="block text-sm font-medium text-neutral-700"
        >
          Choose the campaign you want to import
        </label>
        <select
          id="campaign"
          value={selectedCampaign?.id || ""}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500"
        >
          <option value="">Select a campaign</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {selectedCampaign && (
        <dl className="grid grid-cols-2 gap-3 rounded-md border border-neutral-200 bg-white p-4 text-xs">
          <div>
            <dt className="text-neutral-500">Campaign Name</dt>
            <dd className="font-medium text-neutral-700">
              {selectedCampaign.name}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Campaign ID</dt>
            <dd className="font-medium text-neutral-700">
              {selectedCampaign.id}
            </dd>
          </div>
        </dl>
      )}

      <Button
        text="Start import"
        loading={importing}
        disabled={!selectedCampaign}
        className="w-full justify-center"
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
