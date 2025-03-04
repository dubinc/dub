import { setRewardfulTokenAction } from "@/lib/actions/partners/set-rewardful-token";
import { startRewardfulImportAction } from "@/lib/actions/partners/start-rewardful-import";
import { RewardfulCampaign } from "@/lib/rewardful/types";
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
import { capitalize, fetcher } from "@dub/utils";
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

function ImportRewardfulModal({
  showImportRewardfulModal,
  setShowImportRewardfulModal,
}: {
  showImportRewardfulModal: boolean;
  setShowImportRewardfulModal: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const { program } = useProgram();
  const searchParams = useSearchParams();
  const { queryParams } = useRouterStuff();
  const { id: workspaceId } = useWorkspace();
  const [apiToken, setApiToken] = useState("");
  const { slug } = useParams() as { slug?: string };
  const [step, setStep] = useState<"token" | "campaigns">("token");

  const [selectedCampaign, setSelectedCampaign] =
    useState<RewardfulCampaign | null>(null);

  const {
    executeAsync: setRewardfulToken,
    isPending: isSettingRewardfulToken,
  } = useAction(setRewardfulTokenAction, {
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
    onSuccess: () => {
      setStep("campaigns");
      mutate();
    },
  });

  const {
    executeAsync: startRewardfulImport,
    isPending: isStartingRewardfulImport,
  } = useAction(startRewardfulImportAction, {
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
    onSuccess: () => {
      toast.success(
        "Successfully added campaigns to import queue! We will send you an email when your campaigns have been fully imported.",
      );
      router.push(`/${slug}/programs/${program?.id}/partners`);
    },
  });

  // TODO
  // Replace this with new hook

  const {
    data: campaigns,
    isLoading: isLoadingCampaigns,
    mutate,
  } = useSWRImmutable<RewardfulCampaign[]>(
    showImportRewardfulModal &&
      program?.id &&
      workspaceId &&
      step === "campaigns" &&
      `/api/programs/rewardful/campaigns?workspaceId=${workspaceId}`,
    fetcher,
  );

  useEffect(() => {
    if (searchParams?.get("import") === "rewardful") {
      setShowImportRewardfulModal(true);
    } else {
      setShowImportRewardfulModal(false);
    }
  }, [searchParams]);

  // submit the api token to get the campaigns
  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!workspaceId || !program?.id) {
      return;
    }

    await setRewardfulToken({
      workspaceId,
      token: apiToken,
    });
  };

  // submit the campaigns to import
  const handleCampaignsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!workspaceId || !program?.id) {
      return;
    }

    if (!selectedCampaign) {
      toast.error("Please select a campaign to import.");
      return;
    }

    await startRewardfulImport({
      workspaceId,
      programId: program.id,
      campaignId: selectedCampaign?.id,
    });
  };

  return (
    <Modal
      showModal={showImportRewardfulModal}
      setShowModal={setShowImportRewardfulModal}
      onClose={() =>
        queryParams({
          del: "import",
        })
      }
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-8 sm:px-16">
        <div className="flex items-center space-x-3 py-4">
          <img
            src="https://assets.dub.co/misc/icons/rewardful.svg"
            alt="Rewardful logo"
            className="h-10 w-10 rounded-full"
          />
          <ArrowRight className="h-5 w-5 text-neutral-600" />
          <Logo />
        </div>
        <h3 className="text-lg font-medium">Import Your Rewardful Campaigns</h3>
        <p className="text-center text-sm text-neutral-500">
          Import your existing Rewardful campaigns into{" "}
          {process.env.NEXT_PUBLIC_APP_NAME} with just a few clicks.
        </p>
      </div>

      <div className="flex flex-col space-y-6 bg-neutral-50 px-4 py-8 text-left sm:px-16">
        {step === "token" ? (
          <TokenStep
            apiToken={apiToken}
            setApiToken={setApiToken}
            isSubmittingToken={isSettingRewardfulToken}
            onSubmit={handleTokenSubmit}
          />
        ) : isLoadingCampaigns || !workspaceId ? (
          <div className="flex flex-col items-center justify-center space-y-4 bg-none">
            <LoadingSpinner />
            <p className="text-sm text-neutral-500">Loading campaigns...</p>
          </div>
        ) : campaigns ? (
          <CampaignsStep
            campaigns={campaigns}
            selectedCampaign={selectedCampaign}
            setSelectedCampaign={setSelectedCampaign}
            importing={isStartingRewardfulImport}
            onSubmit={handleCampaignsSubmit}
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
  apiToken,
  setApiToken,
  isSubmittingToken,
  onSubmit,
}: {
  apiToken: string;
  setApiToken: (token: string) => void;
  isSubmittingToken: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}) {
  const { isMobile } = useMediaQuery();
  return (
    <form onSubmit={onSubmit} className="flex flex-col space-y-4">
      <div>
        <label
          htmlFor="apiToken"
          className="block text-sm font-medium text-neutral-700"
        >
          Rewardful API Secret
        </label>
        <input
          type="password"
          id="apiToken"
          value={apiToken}
          autoFocus={!isMobile}
          onChange={(e) => setApiToken(e.target.value)}
          placeholder="Enter your Rewardful API token"
          className="mt-1 block w-full rounded-md border border-neutral-200 px-3 py-2 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
          required
        />
        <p className="mt-1.5 text-xs text-neutral-500">
          You can find your Rewardful API Secret on your{" "}
          <a
            href="https://app.getrewardful.com/company/edit"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600"
          >
            Company settings page
          </a>
        </p>
      </div>
      <Button
        text={isSubmittingToken ? "Fetching campaigns..." : "Fetch campaigns"}
        loading={isSubmittingToken}
        disabled={!apiToken}
      />
    </form>
  );
}

function CampaignsStep({
  campaigns,
  selectedCampaign,
  setSelectedCampaign,
  importing,
  onSubmit,
}: {
  campaigns: RewardfulCampaign[];
  selectedCampaign: RewardfulCampaign | null;
  setSelectedCampaign: (campaign: RewardfulCampaign | null) => void;
  importing: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}) {
  const handleCampaignChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const campaign = campaigns.find((c) => c.id === e.target.value) || null;
      setSelectedCampaign(campaign);
    },
    [campaigns, setSelectedCampaign],
  );

  const formatCommission = useCallback((campaign: RewardfulCampaign) => {
    return campaign.reward_type === "percent"
      ? `${campaign.commission_percent}%`
      : `$${(campaign.commission_amount_cents / 100).toFixed(2)}`;
  }, []);

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
          onChange={handleCampaignChange}
          className="mt-1 block w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500"
        >
          <option value="">Select a campaign</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </select>
      </div>

      {selectedCampaign && (
        <dl className="grid grid-cols-2 gap-3 rounded-md border border-neutral-200 bg-white p-4 text-xs">
          <div>
            <dt className="text-neutral-500">Affiliates</dt>
            <dd className="font-medium text-neutral-700">
              {selectedCampaign.affiliates}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Commission</dt>
            <dd className="font-medium text-neutral-700">
              {formatCommission(selectedCampaign)}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Commission Period</dt>
            <dd className="font-medium text-neutral-700">
              {selectedCampaign.max_commission_period_months} months
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Type</dt>
            <dd className="font-medium text-neutral-700">
              {capitalize(selectedCampaign.reward_type)}
            </dd>
          </div>
        </dl>
      )}

      <Button
        text="Import campaign"
        loading={importing}
        disabled={!selectedCampaign}
        className="w-full justify-center"
      />
    </form>
  );
}

export function useImportRewardfulModal() {
  const [showImportRewardfulModal, setShowImportRewardfulModal] =
    useState(false);

  const ImportRewardfulModalCallback = useCallback(() => {
    return (
      <ImportRewardfulModal
        showImportRewardfulModal={showImportRewardfulModal}
        setShowImportRewardfulModal={setShowImportRewardfulModal}
      />
    );
  }, [showImportRewardfulModal, setShowImportRewardfulModal]);

  return useMemo(
    () => ({
      setShowImportRewardfulModal,
      ImportRewardfulModal: ImportRewardfulModalCallback,
    }),
    [setShowImportRewardfulModal, ImportRewardfulModalCallback],
  );
}
