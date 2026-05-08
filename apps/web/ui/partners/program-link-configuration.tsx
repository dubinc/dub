import { getLinkStructureOptions } from "@/lib/partners/get-link-structure-options";
import { mutatePrefix } from "@/lib/swr/mutate";
import useDomains from "@/lib/swr/use-domains";
import useWorkspace from "@/lib/swr/use-workspace";
import { DomainVerificationStatusProps } from "@/lib/types";
import DomainConfiguration from "@/ui/domains/domain-configuration";
import { DomainSelector } from "@/ui/domains/domain-selector";
import { CheckCircleFill } from "@/ui/shared/icons";
import {
  AnimatedSizeContainer,
  Button,
  Globe,
  InfoTooltip,
  Input,
  LinkLogo,
  Modal,
  useMediaQuery,
  Wordmark,
} from "@dub/ui";
import { ArrowTurnRight2, ChevronRight, LoadingSpinner } from "@dub/ui/icons";
import {
  cn,
  fetcher,
  getApexDomain,
  getPrettyUrl,
  isWorkspaceBillingTrialActive,
  truncate,
} from "@dub/utils";
import { AnimatePresence, motion } from "motion/react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWRImmutable from "swr/immutable";
import { useDebounce } from "use-debounce";
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
          Where people will be redirected to when they click on your partners'
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
  const { slug, trialEndsAt } = useWorkspace();
  const { allWorkspaceDomains: domains, loading: isLoadingDomains } =
    useDomains();
  const trialActive = isWorkspaceBillingTrialActive(trialEndsAt);

  const [state, setState] = useState<"idle" | "select">(
    domain ? "select" : "idle",
  );
  const [showSubdomainModal, setShowSubdomainModal] = useState(false);

  const { AddEditDomainModal, setShowAddEditDomainModal } =
    useAddEditDomainModal({
      onSuccess: (domain) => {
        onDomainChange(domain.slug);
        setState("select");
      },
    });

  const { RegisterDomainModal, setShowRegisterDomainModal } =
    useRegisterDomainModal({
      onSuccess: (domain) => {
        onDomainChange(domain);
        setState("select");
      },
      setRegisteredParam: false,
    });

  const idleOptions = useMemo(
    () => [
      {
        icon: <Globe className="size-5 text-neutral-900" />,
        title: "Connect a custom domain",
        badge: "Recommended",
        badgeClassName: "bg-green-100 text-green-800",
        description:
          "Dedicate a domain exclusively for your short links and program.",
        onSelect: () => {
          if (!domains?.length) setShowAddEditDomainModal(true);
          else setState("select");
        },
        loading: isLoadingDomains,
      },
      trialActive
        ? {
            icon: <Wordmark className="h-3 text-neutral-900" />,
            title: "Use .dub.link subdomain",
            badge: "Instant setup",
            badgeClassName: "bg-bg-inverted/10 text-neutral-800",
            description:
              "A fast way to launch. Switch to a custom domain later.",
            onSelect: () => setShowSubdomainModal(true),
          }
        : {
            icon: "https://assets.dub.co/icons/crown.webp",
            title: "Claim a free .link domain",
            badge: "No setup",
            badgeClassName: "bg-green-100 text-green-800",
            description: "Free for one year with your paid account.",
            onSelect: () => setShowRegisterDomainModal(true),
          },
    ],
    [
      domains,
      isLoadingDomains,
      trialActive,
      setShowAddEditDomainModal,
      setShowRegisterDomainModal,
      setShowSubdomainModal,
    ],
  );

  return (
    <>
      <RegisterDomainModal />
      <AddEditDomainModal />
      <Modal
        showModal={showSubdomainModal}
        setShowModal={setShowSubdomainModal}
        drawerRootProps={{ repositionInputs: false }}
        className="max-h-[90vh] max-w-md"
      >
        <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white px-4 py-4 text-lg font-medium sm:px-6">
          Use .dub.link subdomain
        </div>
        <DubLinkSubdomainForm
          initialSlug={slug || "company"}
          onCancel={() => setShowSubdomainModal(false)}
          onSuccess={(domain) => {
            onDomainChange(domain);
            setShowSubdomainModal(false);
            setState("select");
          }}
        />
      </Modal>
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
                            {typeof option.icon === "string" ? (
                              <img
                                src={option.icon}
                                alt=""
                                className="size-7 object-contain transition-transform ease-out group-hover:scale-105"
                              />
                            ) : (
                              <div className="transition-transform ease-out group-hover:scale-105">
                                {option.icon}
                              </div>
                            )}
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

function DubLinkSubdomainForm({
  initialSlug,
  onCancel,
  onSuccess,
}: {
  initialSlug: string;
  onCancel: () => void;
  onSuccess: (domain: string) => void;
}) {
  const workspace = useWorkspace();
  const { isMobile } = useMediaQuery();
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slug, setSlug] = useState(
    initialSlug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
  );
  const [available, setAvailable] = useState<boolean | null>(null);
  const [debouncedSlug] = useDebounce(slug, 500);

  const domain = `${slug}.dub.link`.toLowerCase();
  const debouncedDomain = `${debouncedSlug}.dub.link`.toLowerCase();
  const hasValidatedSlug = slug === debouncedSlug;
  const isAvailable = available === true && hasValidatedSlug;
  const canClaim = isAvailable && Boolean(workspace.id);

  useEffect(() => {
    if (!debouncedSlug.trim()) {
      setAvailable(null);
      return;
    }

    setIsChecking(true);
    setAvailable(null);

    const controller = new AbortController();

    fetch(`/api/domains/${encodeURIComponent(debouncedDomain)}/validate`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (controller.signal.aborted) return;

        if (!res.ok) {
          setAvailable(false);
          return;
        }

        const data = await res.json();
        if (!controller.signal.aborted) {
          setAvailable(data.status === "available");
        }
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setAvailable(false);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsChecking(false);
        }
      });

    return () => controller.abort();
  }, [debouncedSlug, debouncedDomain]);

  const claimDomain = async () => {
    if (!workspace.id) {
      toast.error("Workspace is still loading. Please try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/domains?workspaceId=${workspace.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug: domain }),
      });

      if (!res.ok) {
        let message = "Failed to add domain.";

        try {
          const data = await res.json();
          const error = data?.error;

          if (typeof error === "string") {
            message = error;
          } else if (typeof error?.message === "string") {
            message = error.message;
          } else if (typeof data?.message === "string") {
            message = data.message;
          }
        } catch {
          message = "Failed to add domain.";
        }

        toast.error(message);
        return;
      }

      await Promise.all([
        mutatePrefix("/api/domains"),
        mutatePrefix("/api/links"),
      ]);
      toast.success("Successfully added domain!");
      onSuccess(domain);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (canClaim) await claimDomain();
      }}
    >
      <div className="flex flex-col gap-y-6 px-4 pt-6 text-left sm:px-6">
        <div>
          <p className="block text-sm font-medium text-neutral-800">
            Search domains
          </p>

          <div className="mt-2">
            <div
              className={cn(
                "-m-1 rounded-[0.625rem] p-1",
                available === true
                  ? hasValidatedSlug
                    ? "bg-green-100"
                    : "bg-neutral-100"
                  : available === false && hasValidatedSlug
                    ? "bg-orange-100"
                    : "bg-neutral-100",
              )}
            >
              <div className="flex rounded-md border border-neutral-300 bg-white">
                <input
                  name="domain"
                  id="domain"
                  type="text"
                  required
                  autoComplete="off"
                  className="block w-full rounded-md rounded-r-none border-0 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-0 sm:text-sm"
                  autoFocus={!isMobile}
                  placeholder={initialSlug}
                  value={slug}
                  onChange={(e) => {
                    setSlug(
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    );
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                />
                <span className="inline-flex items-center rounded-md rounded-l-none bg-white pr-3 font-medium text-neutral-500 sm:text-sm">
                  .dub.link
                </span>
              </div>

              <AnimatedSizeContainer
                height
                transition={{ ease: "easeInOut", duration: 0.1 }}
              >
                <div className="flex justify-between gap-3 px-2 pb-2 pt-3 text-sm text-neutral-700">
                  <p>
                    {isAvailable ? (
                      <>
                        <span className="font-semibold text-neutral-800">
                          {domain}
                        </span>{" "}
                        is available.
                      </>
                    ) : available === false && hasValidatedSlug ? (
                      <>
                        <span className="font-semibold text-neutral-800">
                          {domain}
                        </span>{" "}
                        is not available.
                      </>
                    ) : slug.trim() && hasValidatedSlug ? (
                      <>
                        Checking availability for{" "}
                        <strong className="font-semibold">
                          {truncate(domain, 25)}
                        </strong>
                      </>
                    ) : (
                      <>&nbsp;</>
                    )}
                  </p>
                  {(isChecking && hasValidatedSlug) ||
                  (available === null && slug.trim() && hasValidatedSlug) ? (
                    <LoadingSpinner className="mr-0.5 mt-0.5 size-4 shrink-0" />
                  ) : isAvailable ? (
                    <CheckCircleFill className="size-5 shrink-0 text-green-500" />
                  ) : null}
                </div>
              </AnimatedSizeContainer>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2 border-t border-neutral-200 p-4 sm:px-6">
        <Button
          type="button"
          variant="secondary"
          text="Cancel"
          className="h-9 w-fit"
          onClick={onCancel}
        />
        <Button
          type="submit"
          text="Claim domain"
          className="h-9 w-fit"
          disabled={!canClaim}
          loading={isSubmitting}
        />
      </div>
    </form>
  );
}

function DomainOnboardingSelection({
  domain,
  onDomainChange,
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
        This domain will be used for your program's referral links
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
