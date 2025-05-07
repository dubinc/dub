import useWorkspace from "@/lib/swr/use-workspace";
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
        <div className="px-6 py-8 sm:px-8">
          <div className="relative">
            <div
              ref={scrollRef}
              onScroll={updateScrollProgress}
              className="scrollbar-hide max-h-[calc(100vh-350px)] overflow-y-auto pb-6 text-left"
            >
              <h1 className="text-lg font-semibold text-neutral-900">
                Dub {plan?.name} looks good on you!
              </h1>
              <p className="mt-2 text-sm text-neutral-600">
                Thank you for upgrading to the {plan?.name} plan. You now have
                access to more powerful features
                {dotLinkClaimed ? (
                  <> and higher limits.</>
                ) : (
                  <>
                    , higher limits, and a{" "}
                    <strong className="font-semibold text-neutral-800">
                      free .link domain for 1 year
                    </strong>
                    .
                  </>
                )}
              </p>
              {!dotLinkClaimed && (
                <div className="mt-6 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
                  <RegisterDomainForm
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
            onClick={() =>
              queryParams({
                del: ["upgraded", "plan", "period"],
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
