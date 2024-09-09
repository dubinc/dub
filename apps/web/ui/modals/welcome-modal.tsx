import {
  Button,
  Logo,
  Modal,
  useRouterStuff,
  useScrollProgress,
} from "@dub/ui";
import { cn, getPlanDetails, PLANS, PRO_PLAN } from "@dub/utils";
import { usePlausible } from "next-plausible";
import Image from "next/image";
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
import { PlanFeatures } from "../workspaces/plan-features";

function WelcomeModal({
  showWelcomeModal,
  setShowWelcomeModal,
}: {
  showWelcomeModal: boolean;
  setShowWelcomeModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { queryParams } = useRouterStuff();
  const searchParams = useSearchParams();

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, updateScrollProgress } = useScrollProgress(scrollRef);

  const planId = searchParams.get("plan");
  const upgraded = searchParams.get("upgraded");
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
      showModal={showWelcomeModal}
      setShowModal={setShowWelcomeModal}
      onClose={() =>
        queryParams({
          del: ["onboarded", "upgraded", "plan", "period"],
        })
      }
    >
      <div className="flex flex-col">
        <div className="relative h-48 w-full overflow-hidden bg-white">
          <BackgroundGradient className="opacity-15" />
          <Image
            src="https://assets.dub.co/misc/welcome-modal-background.svg"
            alt="Welcome to Dub"
            fill
            className="object-cover object-top"
          />
          <BackgroundGradient className="opacity-100 mix-blend-soft-light" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="aspect-square h-1/2 rounded-full bg-white">
              <Logo className="size-full" />
            </div>
          </div>
        </div>
        <div className="px-12 py-8">
          <div className="relative">
            <div
              ref={scrollRef}
              onScroll={updateScrollProgress}
              className="scrollbar-hide max-h-[calc(100vh-350px)] overflow-y-auto pb-6"
            >
              <h1
                className={cn(
                  "text-lg font-medium text-gray-950",
                  plan ? "text-left" : "text-center",
                )}
              >
                {plan
                  ? `Dub ${plan.name} looks good on you!`
                  : "Welcome to Dub!"}
              </h1>
              <p
                className={cn(
                  "mt-2 text-sm text-gray-500",
                  plan ? "text-left" : "text-center",
                )}
              >
                {upgraded
                  ? `Thank you for upgrading to the ${plan?.name} plan! You now have access to more powerful features and higher limits.`
                  : "Thanks for signing up – your account is ready to go! Now you have one central, organized place to build and manage all your short links."}
              </p>
              {plan && (
                <>
                  <h2 className="mb-2 mt-6 text-base font-medium text-gray-950">
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

export function useWelcomeModal() {
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const WelcomeModalCallback = useCallback(() => {
    return (
      <WelcomeModal
        showWelcomeModal={showWelcomeModal}
        setShowWelcomeModal={setShowWelcomeModal}
      />
    );
  }, [showWelcomeModal, setShowWelcomeModal]);

  return useMemo(
    () => ({
      setShowWelcomeModal,
      WelcomeModal: WelcomeModalCallback,
    }),
    [setShowWelcomeModal, WelcomeModalCallback],
  );
}

function BackgroundGradient({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute left-0 top-0 aspect-square w-full overflow-hidden sm:aspect-[2/1]",
        "[mask-image:radial-gradient(70%_100%_at_50%_30%,_black_70%,_#0009)]",
        className,
      )}
    >
      <div
        className="absolute inset-0 saturate-150"
        style={{
          backgroundImage: `conic-gradient(from -25deg at 65% -10%, #3A8BFD 0deg, #FF0000 172.98deg, #855AFC 215.14deg, #FF7B00 257.32deg, #3A8BFD 360deg)`,
        }}
      />
      <div className="absolute inset-0 backdrop-blur-[50px]" />
    </div>
  );
}
