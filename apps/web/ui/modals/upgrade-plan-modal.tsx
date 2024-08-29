import useWorkspace from "@/lib/swr/use-workspace";
import {
  Badge,
  IconMenu,
  LoadingSpinner,
  Logo,
  Modal,
  Popover,
  Tick,
  useRouterStuff,
} from "@dub/ui";
import {
  APP_DOMAIN,
  SELF_SERVE_PAID_PLANS,
  STAGGER_CHILD_VARIANTS,
  capitalize,
  cn,
} from "@dub/utils";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { usePlausible } from "next-plausible";
import Link from "next/link";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Confetti from "react-dom-confetti";
import { PlanFeatures } from "../workspaces/plan-features";
import { UpgradePlanButton } from "../workspaces/upgrade-plan-button";

const PERIODS = ["monthly", "yearly"] as const;

function UpgradePlanModal({
  showUpgradePlanModal,
  setShowUpgradePlanModal,
}: {
  showUpgradePlanModal: boolean;
  setShowUpgradePlanModal: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const params = useParams() as { slug: string };
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const welcomeFlow = pathname === "/welcome";
  const slug = welcomeFlow ? searchParams?.get("slug") : params.slug;

  const { plan: currentPlan } = useWorkspace();
  const plan = searchParams.get("upgrade") ?? "pro";
  const selectedPlan =
    SELF_SERVE_PAID_PLANS.find((p) => p.name.toLowerCase() === plan) ??
    SELF_SERVE_PAID_PLANS[0];
  const [openPlanSelector, setOpenPlanSelector] = useState(false);

  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("yearly");
  const [openPeriodSelector, setOpenPeriodSelector] = useState(false);

  const [clickedCompare, setClickedCompare] = useState(false);
  const { queryParams } = useRouterStuff();

  const plausible = usePlausible();

  return (
    <Modal
      showModal={showUpgradePlanModal}
      setShowModal={setShowUpgradePlanModal}
      className="max-w-lg"
      preventDefaultClose={welcomeFlow}
      onClose={() => {
        if (welcomeFlow) {
          router.back();
        } else {
          queryParams({
            del: "upgrade",
          });
        }
      }}
    >
      <motion.div
        variants={{
          show: {
            transition: {
              staggerChildren: 0.15,
            },
          },
        }}
        initial="hidden"
        animate="show"
        className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-8 sm:px-16"
      >
        <motion.div variants={STAGGER_CHILD_VARIANTS}>
          <Logo />
        </motion.div>
        <motion.h3
          className="text-lg font-medium"
          variants={STAGGER_CHILD_VARIANTS}
        >
          Upgrade to {selectedPlan.name}
        </motion.h3>
        <motion.p
          className="text-center text-sm text-gray-500"
          variants={STAGGER_CHILD_VARIANTS}
        >
          Enjoy higher limits and extra features <br /> with Dub.co{" "}
          {selectedPlan.name}
        </motion.p>
      </motion.div>
      <div className="bg-gray-50 px-4 py-6 text-left sm:px-16">
        <div className="flex w-full gap-x-1">
          <Popover
            content={
              <div className="w-full p-2 md:w-48">
                {SELF_SERVE_PAID_PLANS.map(({ name, colors }, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      queryParams({
                        set: {
                          upgrade: name.toLowerCase(),
                        },
                      });
                      setOpenPlanSelector(false);
                    }}
                    className="flex w-full items-center justify-between space-x-2 rounded-md p-2 hover:bg-gray-100 active:bg-gray-200"
                  >
                    <IconMenu
                      text={name}
                      icon={
                        <div
                          className={cn("h-2 w-2 rounded-full", colors.bg)}
                        />
                      }
                    />
                    {plan === name.toLowerCase() && (
                      <Tick className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                ))}
              </div>
            }
            openPopover={openPlanSelector}
            setOpenPopover={setOpenPlanSelector}
          >
            <button
              onClick={() => setOpenPlanSelector(!openPlanSelector)}
              className={cn(
                "group flex h-10 w-full cursor-pointer appearance-none items-center justify-between gap-x-2 truncate rounded-md border px-3 text-sm outline-none transition-all lg:w-48",
                "border-gray-200 bg-white text-gray-900 placeholder-gray-400",
                "focus-visible:border-gray-500 data-[state=open]:border-gray-500 data-[state=open]:ring-4 data-[state=open]:ring-gray-200",
              )}
            >
              <IconMenu
                text={selectedPlan.name}
                icon={
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      selectedPlan.colors.bg,
                    )}
                  />
                }
              />
              <ChevronDown
                className={`h-5 w-5 text-gray-400 ${
                  openPlanSelector ? "rotate-180 transform" : ""
                } transition-all duration-75`}
              />
            </button>
          </Popover>
          <Confetti
            active={period === "yearly"}
            config={{ elementCount: 200, spread: 90 }}
          />
          <Popover
            content={
              <div className="w-full p-2 md:w-48">
                {PERIODS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setPeriod(p);
                      setOpenPeriodSelector(false);
                    }}
                    className="flex w-full items-center justify-between space-x-2 rounded-md p-2 hover:bg-gray-100 active:bg-gray-200"
                  >
                    <span className="text-sm text-gray-500">
                      {capitalize(p)}
                    </span>
                    {period === p && (
                      <Tick className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                ))}
              </div>
            }
            openPopover={openPeriodSelector}
            setOpenPopover={setOpenPeriodSelector}
          >
            <button
              onClick={() => setOpenPeriodSelector(!openPeriodSelector)}
              className={cn(
                "group flex h-10 w-full cursor-pointer appearance-none items-center justify-between gap-x-2 truncate rounded-md border px-3 text-sm outline-none transition-all lg:w-48",
                "border-gray-200 bg-white text-gray-900 placeholder-gray-400",
                "focus-visible:border-gray-500 data-[state=open]:border-gray-500 data-[state=open]:ring-4 data-[state=open]:ring-gray-200",
              )}
            >
              <span className="text-sm text-gray-500">
                {capitalize(period)}
              </span>
              <ChevronDown
                className={`h-5 w-5 text-gray-400 ${
                  openPeriodSelector ? "rotate-180 transform" : ""
                } transition-all duration-75`}
              />
            </button>
          </Popover>
        </div>
        <motion.div
          className="mb-4 mt-6 flex flex-col"
          variants={STAGGER_CHILD_VARIANTS}
          initial="hidden"
          animate="show"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h4 className="font-medium text-gray-900">
                {selectedPlan.name} {capitalize(period)}
              </h4>
              <Badge
                variant="neutral"
                className="text-sm font-normal normal-case"
              >
                ${selectedPlan.price[period]!.toString()}
                /mo
                <span className="hidden sm:inline-block">
                  , billed {period}
                </span>
              </Badge>
            </div>
          </div>
          <PlanFeatures plan={selectedPlan.name} className="my-4" />
          <UpgradePlanButton
            plan={selectedPlan.name}
            period={period}
            workspaceSlug={slug ?? undefined}
          />
          <div className="mt-2 flex items-center justify-center space-x-2">
            {currentPlan === "free" ? (
              <a
                href="https://dub.co/pricing"
                target="_blank"
                className="text-center text-xs text-gray-500 underline-offset-4 transition-all hover:text-gray-800 hover:underline"
              >
                Compare plans
              </a>
            ) : (
              <button
                onClick={() => {
                  setClickedCompare(true);
                  fetch(`/api/workspaces/${slug}/billing/upgrade`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      plan,
                      period,
                      baseUrl: `${APP_DOMAIN}${pathname}`,
                      comparePlans: true,
                    }),
                  })
                    .then(async (res) => {
                      const url = await res.json();
                      router.push(url);
                    })
                    .catch((err) => {
                      alert(err);
                      setClickedCompare(false);
                    });
                }}
                disabled={clickedCompare}
                className={cn(
                  "flex items-center space-x-2 text-center text-xs text-gray-500",
                  clickedCompare
                    ? "cursor-not-allowed"
                    : "underline-offset-4 transition-all hover:text-gray-800 hover:underline",
                )}
              >
                {clickedCompare && (
                  <LoadingSpinner className="h-4 w-4" aria-hidden="true" />
                )}
                <p>Compare plans</p>
              </button>
            )}
            <p className="text-gray-500">•</p>
            {welcomeFlow ? (
              <Link
                href={`/${slug}`}
                className="text-center text-xs text-gray-500 underline-offset-4 transition-all hover:text-gray-800 hover:underline"
              >
                Skip for now
              </Link>
            ) : (
              <a
                href="https://dub.co/enterprise"
                target="_blank"
                className="text-center text-xs text-gray-500 underline-offset-4 transition-all hover:text-gray-800 hover:underline"
              >
                Looking for enterprise?
              </a>
            )}
          </div>
        </motion.div>
      </div>
    </Modal>
  );
}

export function useUpgradePlanModal() {
  const [showUpgradePlanModal, setShowUpgradePlanModal] = useState(false);
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams?.get("upgrade")) {
      setShowUpgradePlanModal(true);
    } else {
      setShowUpgradePlanModal(false);
    }
  }, [searchParams]);

  const UpgradePlanModalCallback = useCallback(() => {
    return (
      <UpgradePlanModal
        showUpgradePlanModal={showUpgradePlanModal}
        setShowUpgradePlanModal={setShowUpgradePlanModal}
      />
    );
  }, [showUpgradePlanModal, setShowUpgradePlanModal]);

  return useMemo(
    () => ({
      setShowUpgradePlanModal,
      UpgradePlanModal: UpgradePlanModalCallback,
    }),
    [setShowUpgradePlanModal, UpgradePlanModalCallback],
  );
}
