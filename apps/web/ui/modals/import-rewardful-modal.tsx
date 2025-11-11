import { setRewardfulTokenAction } from "@/lib/actions/partners/set-rewardful-token";
import { startRewardfulImportAction } from "@/lib/actions/partners/start-rewardful-import";
import { RewardfulCampaign } from "@/lib/rewardful/types";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  AnimatedSizeContainer,
  Button,
  Check2,
  LoadingSpinner,
  Logo,
  Magnifier,
  Modal,
  ScrollContainer,
  ToggleGroup,
  useMediaQuery,
  useRouterStuff,
} from "@dub/ui";
import { cn, currencyFormatter, fetcher } from "@dub/utils";
import { Command } from "cmdk";
import { ArrowRight, ServerOff, Users } from "lucide-react";
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
import { useDebounce } from "use-debounce";

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

  const [selectedCampaignIds, setSelectedCampaignIds] = useState<
    string[] | null
  >(null);

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
        `Successfully added your Rewardful campaigns to import queue! We will send you an email when your campaigns have been fully imported.`,
      );
      router.push(`/${slug}/program/partners`);
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

    if (!workspaceId || !program?.id || !campaigns) {
      return;
    }

    const campaignIdsToImport =
      selectedCampaignIds || campaigns.map((c) => c.id);

    if (!campaignIdsToImport.length) {
      toast.error("Please select at least one campaign to import.");
      return;
    }

    await startRewardfulImport({
      workspaceId,
      campaignIds: campaignIdsToImport,
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
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-4 pt-8 sm:px-8">
        <div className="flex items-center space-x-3">
          <img
            src="https://assets.dub.co/misc/icons/rewardful.svg"
            alt="Rewardful logo"
            className="h-10 w-10 rounded-full"
          />
          <ArrowRight className="h-5 w-5 text-neutral-600" />
          <Logo />
        </div>
        <div className="flex flex-col items-center space-y-1">
          <h3 className="text-lg font-medium">
            Import Your Rewardful Campaigns
          </h3>
          <p className="text-center text-sm text-neutral-500">
            Import your existing Rewardful campaigns. You can select specific
            campaigns or import all of them at once.
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center space-x-2 pt-2">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
              step === "token"
                ? "bg-neutral-900 text-white"
                : "bg-green-100 text-green-600"
            }`}
          >
            {step === "campaigns" ? "✓" : "1"}
          </div>
          <div
            className={`h-px w-8 ${step === "campaigns" ? "bg-green-200" : "bg-neutral-200"}`}
          />
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
              step === "campaigns"
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-400"
            }`}
          >
            2
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-neutral-500">
          <span
            className={step === "token" ? "font-medium text-neutral-900" : ""}
          >
            API Token
          </span>
          <span>•</span>
          <span
            className={
              step === "campaigns" ? "font-medium text-neutral-900" : ""
            }
          >
            Select Campaigns
          </span>
        </div>
      </div>

      <div className="flex flex-col space-y-6 bg-neutral-50 px-4 py-8 text-left sm:px-8">
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
            selectedCampaignIds={selectedCampaignIds}
            setSelectedCampaignIds={setSelectedCampaignIds}
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
      <div className="space-y-2">
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
          placeholder="Enter your Rewardful API secret"
          className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
          required
        />
        <p className="text-xs text-neutral-500">
          You can find this in your{" "}
          <a
            href="https://app.getrewardful.com/company/edit"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-700 underline hover:text-neutral-900"
          >
            Company settings page
          </a>
        </p>
      </div>
      <div className="flex justify-end space-x-2 pt-2">
        <Button
          text={isSubmittingToken ? "Fetching campaigns..." : "Continue"}
          loading={isSubmittingToken}
          disabled={!apiToken}
        />
      </div>
    </form>
  );
}

function CampaignsStep({
  campaigns,
  selectedCampaignIds,
  setSelectedCampaignIds,
  importing,
  onSubmit,
}: {
  campaigns: RewardfulCampaign[];
  selectedCampaignIds: string[] | null;
  setSelectedCampaignIds: (campaignIds: string[] | null) => void;
  importing: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}) {
  const [selectedMode, setSelectedMode] = useState<"all" | "select">(
    selectedCampaignIds?.length ? "select" : "all",
  );

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const [sortedCampaigns, setSortedCampaigns] = useState<
    RewardfulCampaign[] | undefined
  >(undefined);

  const formatCommission = useCallback((campaign: RewardfulCampaign) => {
    return campaign.reward_type === "percent"
      ? `${campaign.commission_percent}%`
      : `${currencyFormatter(campaign.commission_amount_cents)}`;
  }, []);

  const sortCampaigns = useCallback(
    (campaigns: RewardfulCampaign[], search: string) => {
      let filtered = campaigns;

      if (search) {
        filtered = campaigns.filter((campaign) =>
          campaign.name.toLowerCase().includes(search.toLowerCase()),
        );
      }

      return search === ""
        ? [
            ...filtered.filter((c) => selectedCampaignIds?.includes(c.id)),
            ...filtered.filter((c) => !selectedCampaignIds?.includes(c.id)),
          ]
        : filtered;
    },
    [selectedCampaignIds],
  );

  // Sort campaigns when search or selection changes
  useEffect(() => {
    setSortedCampaigns(sortCampaigns(campaigns, debouncedSearch));
  }, [campaigns, debouncedSearch, sortCampaigns]);

  const selectedCampaigns = useMemo(
    () => campaigns.filter((c) => selectedCampaignIds?.includes(c.id)),
    [campaigns, selectedCampaignIds],
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-col space-y-6">
      <div className="space-y-3">
        <label className="block text-sm font-medium text-neutral-700">
          Choose campaigns to import
        </label>

        <div className="space-y-2">
          <ToggleGroup
            className="flex w-full items-center gap-1 rounded-lg border-none bg-neutral-100 p-1"
            optionClassName="h-8 flex items-center justify-center flex-1 text-sm normal-case"
            indicatorClassName="bg-white"
            options={[
              { value: "all", label: "All campaigns" },
              { value: "select", label: "Select campaigns" },
            ]}
            selected={selectedMode}
            selectAction={(value) => {
              setSelectedMode(value as "all" | "select");
              if (value === "all") setSelectedCampaignIds(null);
            }}
          />

          <AnimatedSizeContainer
            height
            transition={{ ease: "easeInOut", duration: 0.1 }}
            className="-m-0.5"
          >
            <div className="p-0.5">
              {selectedMode === "all" ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 py-6">
                  <div className="text-content-default flex items-center gap-1.5 font-semibold">
                    <Users className="size-4 shrink-0" />
                    {campaigns.length}
                  </div>
                  <span className="text-content-subtle text-sm font-medium">
                    Campaigns selected
                  </span>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                  <Command loop shouldFilter={false}>
                    <label className="relative flex grow items-center overflow-hidden border-b border-neutral-200">
                      <Magnifier className="text-content-default ml-3 size-3.5 shrink-0" />
                      <Command.Input
                        placeholder="Search campaigns..."
                        value={search}
                        onValueChange={setSearch}
                        className="grow border-none px-2 py-3 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-0 sm:text-sm"
                      />
                    </label>
                    <ScrollContainer className="h-[190px]">
                      <Command.List
                        className={cn("flex w-full flex-col gap-1 p-1")}
                      >
                        {sortedCampaigns !== undefined ? (
                          <>
                            {sortedCampaigns.map((campaign) => {
                              const checked = Boolean(
                                selectedCampaignIds?.includes(campaign.id),
                              );

                              return (
                                <Command.Item
                                  key={campaign.id}
                                  value={campaign.name}
                                  onSelect={() =>
                                    setSelectedCampaignIds(
                                      selectedCampaignIds?.includes(campaign.id)
                                        ? selectedCampaignIds.length === 1
                                          ? null // Revert to null if there will be no campaigns selected
                                          : selectedCampaignIds.filter(
                                              (id) => id !== campaign.id,
                                            )
                                        : [
                                            ...(selectedCampaignIds ?? []),
                                            campaign.id,
                                          ],
                                    )
                                  }
                                  className={cn(
                                    "flex cursor-pointer select-none items-start gap-3 whitespace-nowrap rounded-md px-3 py-2.5 text-left text-sm text-neutral-700",
                                    "data-[selected=true]:bg-neutral-100",
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "border-border-emphasis mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border bg-white transition-colors duration-75",
                                      checked &&
                                        "border-neutral-900 bg-neutral-900",
                                    )}
                                  >
                                    {checked && (
                                      <span className="sr-only">Checked</span>
                                    )}
                                    <Check2
                                      className={cn(
                                        "size-2.5 text-white transition-[transform,opacity] duration-75",
                                        !checked && "scale-75 opacity-0",
                                      )}
                                    />
                                  </div>
                                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                                    <span className="min-w-0 truncate font-medium">
                                      {campaign.name}
                                    </span>
                                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                                      <span>
                                        {campaign.affiliates} affiliates
                                      </span>
                                      <span>
                                        {formatCommission(campaign)} commission
                                      </span>
                                      <span>
                                        {campaign.max_commission_period_months
                                          ? `${campaign.max_commission_period_months} months`
                                          : "Lifetime"}
                                      </span>
                                    </div>
                                  </div>
                                </Command.Item>
                              );
                            })}
                            {sortedCampaigns.length === 0 ? (
                              <div className="flex min-h-12 items-center justify-center text-sm text-neutral-500">
                                No matches
                              </div>
                            ) : null}
                          </>
                        ) : (
                          // undefined data / explicit loading state
                          <Command.Loading>
                            <div className="flex h-12 items-center justify-center">
                              <LoadingSpinner />
                            </div>
                          </Command.Loading>
                        )}
                      </Command.List>
                    </ScrollContainer>
                  </Command>
                </div>
              )}
            </div>
          </AnimatedSizeContainer>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-2">
        <Button
          text={
            selectedMode === "all"
              ? `Import all campaigns (${campaigns.length})`
              : selectedCampaignIds?.length
                ? `Import ${selectedCampaignIds.length} campaign${selectedCampaignIds.length === 1 ? "" : "s"}`
                : "Import campaigns"
          }
          loading={importing}
          disabled={selectedMode === "select" && !selectedCampaignIds?.length}
        />
      </div>
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
