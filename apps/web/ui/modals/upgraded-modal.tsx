import useWorkspace from "@/lib/swr/use-workspace";
import { Button, Modal, useRouterStuff, useScrollProgress } from "@dub/ui";
import { cn, getPlanDetails, PLANS, PRO_PLAN } from "@dub/utils";
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
import { ModalHero } from "../shared/modal-hero";
import { PlanFeatures } from "../workspaces/plan-features";

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

  return (
    <Modal
      showModal={showUpgradedModal}
      setShowModal={setShowUpgradedModal}
      onClose={() =>
        queryParams({
          del: ["onboarded", "upgraded", "plan", "period"],
        })
      }
    >
      <div className="flex flex-col">
        <ModalHero />
        <div className="px-6 py-8 sm:px-12">
          <div className="relative">
            <div
              ref={scrollRef}
              onScroll={updateScrollProgress}
              className="scrollbar-hide max-h-[calc(100vh-350px)] overflow-y-auto pb-6"
            >
              <h1
                className={cn(
                  "text-lg font-medium text-neutral-950",
                  plan ? "text-left" : "text-center",
                )}
              >
                {plan
                  ? `Dub ${plan.name} looks good on you!`
                  : "Welcome to Dub!"}
              </h1>
              <p
                className={cn(
                  "mt-2 text-sm text-neutral-500",
                  plan ? "text-left" : "text-center",
                )}
              >
                Thank you for upgrading to the {plan?.name} plan! You now have
                access to more powerful features and higher limits.
              </p>
              {plan && (
                <>
                  <h2 className="mb-2 mt-6 text-base font-medium text-neutral-950">
                    Explore the benefits of your {plan.name} plan
                  </h2>
                  <PlanFeatures plan={plan.name} />
                </>
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
            variant="primary"
            text="Get started"
            className="mt-2"
            onClick={() =>
              queryParams({
                del: ["onboarded", "upgraded", "plan", "period"],
              })
            }
          />
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
