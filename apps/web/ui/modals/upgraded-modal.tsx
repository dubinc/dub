import useWorkspace from "@/lib/swr/use-workspace";
import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { Button, Modal, useRouterStuff, useScrollProgress } from "@dub/ui";
import { getPlanDetails, PLANS, PRO_PLAN } from "@dub/utils";
import { usePlausible } from "next-plausible";
import { useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { RegisterDomainForm } from "../domains/register-domain-form";
import { ModalHero } from "../shared/modal-hero";

function UpgradedModal({
  showUpgradedModal,
  setShowUpgradedModal,
}: {
  showUpgradedModal: boolean;
  setShowUpgradedModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { queryParams } = useRouterStuff();
  const searchParams = useSearchParams();

  const { dotLinkClaimed } = useWorkspace();
  const [_, setDotLinkOfferDismissed, { mutateWorkspace }] =
    useWorkspaceStore<string>("dotLinkOfferDismissed");

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, updateScrollProgress } = useScrollProgress(scrollRef);

  const planId = searchParams.get("plan");
  const plausible = usePlausible();

  const handlePlanUpgrade = async () => {
    if (planId) {
      const currentPlan = getPlanDetails(planId);
      const period = searchParams.get("period");
      if (currentPlan && period) {
        plausible(`Upgraded to ${currentPlan.name}`);
        posthog.capture("plan_upgraded", {
          plan: currentPlan.name,
          period,
          revenue: currentPlan.price[period],
        });
      }
    }
  };

  useEffect(() => {
    handlePlanUpgrade();
  }, [searchParams, planId]);

  const plan = planId
    ? PLANS.find(
        (p) => p.name.toLowerCase() === planId.replace("+", " ").toLowerCase(),
      ) ?? PRO_PLAN
    : undefined;

  if (!plan) return null;

  const onClose = async () => {
    queryParams({
      del: ["upgraded", "plan", "period"],
    });
    await setDotLinkOfferDismissed(new Date().toISOString());
    mutateWorkspace();
  };

  return (
    <Modal
      showModal={showUpgradedModal}
      setShowModal={setShowUpgradedModal}
      onClose={onClose}
    >
      <div className="flex flex-col">
        <ModalHero />
        <div className="px-6 py-8 sm:px-8">
          <div className="relative">
            <div
              ref={scrollRef}
              onScroll={updateScrollProgress}
              className="scrollbar-hide max-h-[calc(100vh-400px)] overflow-y-auto pb-6 text-left"
            >
              <h1 className="text-lg font-semibold text-neutral-900">
                Dub {plan?.name} looks good on you!
              </h1>
              <p className="mt-2 text-sm text-neutral-600">
                Thank you for upgrading to the {plan?.name} plan. You now have
                access to more powerful features
                {dotLinkClaimed ? (
                  <> and higher usage limits.</>
                ) : (
                  <>
                    , higher usage limits, and a{" "}
                    <a
                      href="https://dub.link/claim"
                      target="_blank"
                      className="cursor-help font-semibold text-neutral-800 underline decoration-dotted underline-offset-2"
                    >
                      1-year free .link domain
                    </a>
                    .
                  </>
                )}
              </p>
              {!dotLinkClaimed && (
                <div className="mt-6 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
                  <RegisterDomainForm
                    showTerms={false}
                    onSuccess={() => {
                      setShowUpgradedModal(false);
                    }}
                    onCancel={() => setShowUpgradedModal(false)}
                  />
                </div>
              )}
            </div>
            {/* Bottom scroll fade */}
            <div
              className="pointer-events-none absolute bottom-0 left-0 hidden h-16 w-full bg-gradient-to-t from-white sm:block"
              style={{ opacity: 1 - Math.pow(scrollProgress, 2) }}
            ></div>
          </div>
          <Button
            type="button"
            variant={dotLinkClaimed ? "primary" : "secondary"}
            text={
              dotLinkClaimed
                ? "Go to Dub"
                : "No thanks, take me to the dashboard"
            }
            onClick={() => {
              onClose();
              setShowUpgradedModal(false);
            }}
          />
          {!dotLinkClaimed && (
            <p className="mt-6 text-pretty text-center text-xs text-neutral-500">
              By claiming your .link domain, you agree to our{" "}
              <a
                href="https://dub.co/help/article/free-dot-link-domain#terms-and-conditions"
                target="_blank"
                className="underline transition-colors hover:text-neutral-700"
              >
                terms
              </a>
              .<br />
              After the first year, your renewal is $12/year.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function useUpgradedModal() {
  const [showUpgradedModal, setShowUpgradedModal] = useState(false);

  const UpgradedModalCallback = useCallback(() => {
    return (
      <UpgradedModal
        showUpgradedModal={showUpgradedModal}
        setShowUpgradedModal={setShowUpgradedModal}
      />
    );
  }, [showUpgradedModal, setShowUpgradedModal]);

  return useMemo(
    () => ({
      setShowUpgradedModal,
      UpgradedModal: UpgradedModalCallback,
    }),
    [setShowUpgradedModal, UpgradedModalCallback],
  );
}
