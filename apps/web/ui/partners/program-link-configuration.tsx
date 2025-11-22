import { getLinkStructureOptions } from "@/lib/partners/get-link-structure-options";
import useDomains from "@/lib/swr/use-domains";
import useWorkspace from "@/lib/swr/use-workspace";
import { DomainVerificationStatusProps } from "@/lib/types";
import DomainConfiguration from "@/ui/domains/domain-configuration";
import { DomainSelector } from "@/ui/domains/domain-selector";
import { AnimatedSizeContainer, InfoTooltip, Input, LinkLogo } from "@dub/ui";
import { ArrowTurnRight2, ChevronRight, LoadingSpinner } from "@dub/ui/icons";
import { cn, fetcher, getApexDomain, getPrettyUrl } from "@dub/utils";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import useSWRImmutable from "swr/immutable";
import { useAddEditDomainModal } from "../modals/add-edit-domain-modal";
import { useRegisterDomainModal } from "../modals/register-domain-modal";

type DomainProps = {
  domain: string | null;
  onDomainChange: (domain: string) => void;
};

type ProgramLinkConfigurationProps = {
  url: string | null;
  onUrlChange: (url: string) => void;
  hideLinkPreview?: boolean;
} & DomainProps;

export function ProgramLinkConfiguration({
  domain,
  url,
  onDomainChange,
  onUrlChange,
  hideLinkPreview,
}: ProgramLinkConfigurationProps) {
  const linkStructureOptions = getLinkStructureOptions({
    domain,
    url,
  });

  return (
    <div className="space-y-6">
      <DomainOnboarding domain={domain} onDomainChange={onDomainChange} />

      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-800">
          Website URL
        </label>
        <Input
          value={url || ""}
          onChange={(e) => onUrlChange(e.target.value)}
          type="url"
          placeholder="https://dub.co"
          className="max-w-full"
        />
        <p className="text-xs font-normal text-neutral-500">
          Where people will be redirected to when they click on your program's
          referral links
        </p>
      </div>

      <AnimatePresence>
        {domain && !hideLinkPreview && (
          <motion.div
            key="referral-link-preview"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            <h2 className="text-base font-medium text-neutral-900">
              Referral link preview
            </h2>

            <div className="rounded-2xl bg-neutral-50 p-2">
              <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4">
                <div className="relative flex shrink-0 items-center">
                  <div className="absolute inset-0 h-8 w-8 rounded-full border border-neutral-200 sm:h-10 sm:w-10">
                    <div className="h-full w-full rounded-full border border-white bg-gradient-to-t from-neutral-100" />
                  </div>
                  <div className="relative z-10 p-2">
                    {url ? (
                      <LinkLogo
                        apexDomain={getApexDomain(url)}
                        className="size-4 sm:size-6"
                        imageProps={{
                          loading: "lazy",
                        }}
                      />
                    ) : (
                      <div className="size-4 rounded-full bg-neutral-200 sm:size-6" />
                    )}
                  </div>
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="truncate text-sm font-medium text-neutral-700">
                    {linkStructureOptions?.[0].example}
                  </div>

                  <div className="flex min-h-[20px] items-center gap-1 text-sm text-neutral-500">
                    {url ? (
                      <>
                        <ArrowTurnRight2 className="h-3 w-3 shrink-0 text-neutral-400" />
                        <span className="truncate">{getPrettyUrl(url)}</span>
                      </>
                    ) : (
                      <div className="h-3 w-1/2 rounded-md bg-neutral-200" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DomainOnboarding({ domain, onDomainChange }: DomainProps) {
  const { allWorkspaceDomains: domains, loading: isLoadingDomains } =
    useDomains();

  const [state, setState] = useState<"idle" | "select">(
    domain ? "select" : "idle",
  );

  const { RegisterDomainModal, setShowRegisterDomainModal } =
    useRegisterDomainModal({
      onSuccess: (domain) => {
        onDomainChange(domain);
        setState("select");
      },
      setRegisteredParam: false,
    });

  const { AddEditDomainModal, setShowAddEditDomainModal } =
    useAddEditDomainModal({
      onSuccess: (domain) => {
        onDomainChange(domain.slug);
        setState("select");
      },
    });

  const idleOptions = useMemo(
    () => [
      {
        icon: "https://assets.dub.co/icons/crown.webp",
        title: "Claim a free .link domain",
        badge: "No setup",
        badgeClassName: "bg-green-100 text-green-800",
        description: "Free for one year with your paid account.",
        onSelect: () => setShowRegisterDomainModal(true),
      },
      {
        icon: "https://assets.dub.co/icons/link.webp",
        title: "Connect a domain you own",
        badge: "DNS setup required",
        badgeClassName: "bg-bg-inverted/10 text-neutral-800",
        description:
          "Dedicate a domain exclusively for your short links and program.",
        onSelect: () => {
          if (!domains?.length) setShowAddEditDomainModal(true);
          else setState("select");
        },
        loading: isLoadingDomains,
      },
    ],
    [
      domains,
      isLoadingDomains,
      setShowAddEditDomainModal,
      setShowRegisterDomainModal,
    ],
  );

  return (
    <>
      <RegisterDomainModal />
      <AddEditDomainModal />
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-x-2">
            <label className="block text-sm font-medium text-neutral-800">
              Program domain
            </label>
            <InfoTooltip content="A connected domain or sub-domain is required to create a program. [Learn more](https://dub.co/help/article/choosing-a-custom-domain)" />
          </div>
          {state === "select" && (
            <button
              type="button"
              onClick={() => setState("idle")}
              className="text-xs font-normal text-neutral-500 underline underline-offset-2 transition-colors hover:text-neutral-700"
            >
              Select a different option
            </button>
          )}
        </div>
        <AnimatedSizeContainer
          height
          transition={{ ease: "easeOut", duration: 0.1 }}
          className="-m-1"
        >
          <div className="p-1">
            <AnimatePresence initial={false} mode="popLayout">
              {state === "idle" && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex flex-col gap-2">
                    {idleOptions.map((option) => (
                      <button
                        key={option.title}
                        type="button"
                        className={cn(
                          "bg-bg-default border-border-subtle group flex items-center justify-between gap-3 rounded-xl border p-1.5 pr-4",
                          "hover:bg-bg-inverted/[0.03] active:bg-bg-inverted/5",
                          "transition-opacity disabled:cursor-not-allowed disabled:opacity-60",
                        )}
                        onClick={() => option.onSelect()}
                        disabled={option.loading}
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-bg-inverted/5 flex size-10 items-center justify-center rounded-lg">
                            <img
                              src={option.icon}
                              alt=""
                              className="size-7 object-contain transition-transform ease-out group-hover:scale-105"
                            />
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                              <span className="text-content-emphasis text-xs font-semibold">
                                {option.title}
                              </span>
                              <div
                                className={cn(
                                  "rounded-md px-1 text-xs font-semibold",
                                  option.badgeClassName,
                                )}
                              >
                                {option.badge}
                              </div>
                            </div>
                            <p className="text-content-subtle text-xs">
                              {option.description}
                            </p>
                          </div>
                        </div>

                        {option.loading ? (
                          <LoadingSpinner className="size-3 shrink-0" />
                        ) : (
                          <ChevronRight className="text-content-muted size-3 shrink-0 transition-transform ease-out group-hover:translate-x-0.5" />
                        )}
                      </button>
                    ))}
                  </div>

                  <p className="mt-2 text-xs font-normal text-neutral-500">
                    This domain will be used for your program’s referral links
                  </p>
                </motion.div>
              )}

              {state === "select" && (
                <motion.div
                  key="select"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <DomainOnboardingSelection
                    domain={domain}
                    onDomainChange={onDomainChange}
                    onBack={() => setState("idle")}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </AnimatedSizeContainer>
      </div>
    </>
  );
}

function DomainOnboardingSelection({
  domain,
  onDomainChange,
  onBack,
}: DomainProps & { onBack: () => void }) {
  const { id: workspaceId } = useWorkspace();

  const { data: verificationData } = useSWRImmutable<{
    status: DomainVerificationStatusProps;
    response: any;
  }>(
    workspaceId && domain
      ? `/api/domains/${domain}/verify?workspaceId=${workspaceId}`
      : null,
    fetcher,
  );

  return (
    <div>
      <DomainSelector
        selectedDomain={domain || ""}
        setSelectedDomain={onDomainChange}
      />

      <p className="mt-2 text-xs font-normal text-neutral-500">
        This domain will be used for your program’s referral links
      </p>

      <AnimatePresence>
        {domain &&
          verificationData &&
          verificationData.status !== "Valid Configuration" && (
            <motion.div
              key="domain-verification"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-6 overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 px-5 pb-5"
            >
              <DomainConfiguration data={verificationData} />
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}
