import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useUpgradePlanModal } from "@/components/app/modals/upgrade-plan-modal";
import {
  Infinity,
  Divider,
  LoadingDots,
  QuestionCircle,
} from "@/components/shared/icons";
import Tooltip, { ProTiers } from "@/components/shared/tooltip";
import { getPlanFromUsageLimit } from "@/lib/stripe/constants";
import useUsage from "@/lib/swr/use-usage";
import { getFirstAndLastDay, nFormatter } from "@/lib/utils";

export default function PlanUsage() {
  const router = useRouter();
  const {
    data: { usage, usageLimit, billingCycleStart, projectCount } = {},
    loading,
  } = useUsage();

  const [clicked, setClicked] = useState(false);

  const [billingStart, billingEnd] = useMemo(() => {
    if (billingCycleStart) {
      const { firstDay, lastDay } = getFirstAndLastDay(billingCycleStart);
      const start = firstDay.toLocaleDateString("en-us", {
        month: "short",
        day: "numeric",
      });
      const end = lastDay.toLocaleDateString("en-us", {
        month: "short",
        day: "numeric",
      });
      return [start, end];
    }
    return [];
  }, [billingCycleStart]);

  const plan = usageLimit && getPlanFromUsageLimit(usageLimit);

  const { UpgradePlanModal, setShowUpgradePlanModal } = useUpgradePlanModal();

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <UpgradePlanModal />
      <div className="flex flex-col space-y-3 p-10">
        <h2 className="text-xl font-medium">Plan &amp; Usage</h2>
        <p className="text-sm text-gray-500">
          You are currently on the{" "}
          {plan ? (
            <span
              className={`capitalize ${
                plan.startsWith("Enterprise")
                  ? "border-violet-600 bg-violet-600 text-white"
                  : plan.startsWith("Pro")
                  ? "border-blue-500 bg-blue-500 text-white"
                  : "border-black bg-black text-white"
              } rounded-full border px-2 py-0.5 text-xs font-medium`}
            >
              {plan}
            </span>
          ) : (
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-200">
              load
            </span>
          )}{" "}
          plan.
          {billingStart && billingEnd && (
            <>
              {" "}
              Current billing cycle:{" "}
              <span className="font-medium text-black">
                {billingStart} - {billingEnd}
              </span>
              .
            </>
          )}
        </p>
      </div>
      <div className="border-b border-gray-200" />
      <div className="grid grid-cols-1 divide-y divide-gray-200 sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
        <div className="flex flex-col space-y-2 p-10">
          <div className="flex items-center">
            <h3 className="font-medium">Total Link Clicks</h3>
            <Tooltip content="Number of billable link clicks across all your projects.">
              <div className="flex h-4 w-8 justify-center">
                <QuestionCircle className="h-4 w-4 text-gray-600" />
              </div>
            </Tooltip>
          </div>
          {!loading ? (
            <p className="text-sm text-gray-600">
              {nFormatter(usage)} / {nFormatter(usageLimit)} clicks (
              {((usage / usageLimit) * 100).toFixed(1)}%)
            </p>
          ) : (
            <div className="h-5 w-32 animate-pulse rounded-md bg-gray-200" />
          )}
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: !loading ? (usage / usageLimit) * 100 + "%" : "0%",
              }}
              transition={{ duration: 0.5, type: "spring" }}
              className={`${
                usage > usageLimit ? "bg-red-500" : "bg-blue-500"
              } h-3 rounded-full`}
            />
          </div>
        </div>
        <div className="p-10">
          <h3 className="font-medium">Number of Projects</h3>
          <div className="mt-4 flex items-center">
            {projectCount ? (
              <p className="text-2xl font-semibold text-black">
                {nFormatter(projectCount)}
              </p>
            ) : (
              <div className="h-8 w-8 animate-pulse rounded-md bg-gray-200" />
            )}
            <Divider className="h-8 w-8 text-gray-500" />
            <Infinity className="h-8 w-8 text-gray-500" />
          </div>
        </div>
      </div>
      <div className="border-b border-gray-200" />
      <div className="flex flex-col items-center justify-between space-y-3 px-10 py-4 text-center sm:flex-row sm:space-y-0 sm:text-left">
        {plan ? (
          plan === "Pro 1M" ? (
            <p className="text-sm text-gray-500">
              For higher limits, contact us to upgrade to the Enterprise plan.
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              {plan === "Free" ? "For " : "To "}
              <Tooltip content={<ProTiers usageLimit={usageLimit} />}>
                {/* TODO - a simpler version of the homepage slider */}
                <span className="cursor-default font-medium text-gray-700 underline underline-offset-2 hover:text-black">
                  {plan === "Free"
                    ? "increased limits"
                    : "change your monthly click limits"}
                </span>
              </Tooltip>
              {plan === "Free"
                ? ", upgrade to a Pro subscription."
                : ", manage your subscription on Stripe."}
            </p>
          )
        ) : (
          <div className="h-3 w-28 animate-pulse rounded-full bg-gray-200" />
        )}
        {plan ? (
          plan === "Free" ? (
            <button
              onClick={() => {
                setShowUpgradePlanModal(true);
              }}
              className="h-9 w-24 rounded-md border border-blue-500 bg-blue-500 text-sm text-white transition-all duration-150 ease-in-out hover:bg-white hover:text-blue-500 focus:outline-none"
            >
              Upgrade
            </button>
          ) : (
            <div className="flex space-x-3">
              {plan === "Pro 1M" && (
                <a
                  href="mailto:steven@dub.sh?subject=Upgrade%20to%20Enterprise%20Plan"
                  className="flex h-9 w-24 items-center justify-center rounded-md border border-violet-600 bg-violet-600 text-sm text-white transition-all duration-150 ease-in-out hover:bg-white hover:text-violet-600 focus:outline-none"
                >
                  Contact Us
                </a>
              )}
              <button
                onClick={() => {
                  setClicked(true);
                  fetch(`/api/stripe/manage-subscription`, {
                    method: "POST",
                  })
                    .then(async (res) => {
                      const url = await res.json();
                      router.push(url);
                    })
                    .catch((err) => {
                      alert(err);
                      setClicked(false);
                    });
                }}
                disabled={clicked}
                className={`${
                  clicked
                    ? "cursor-not-allowed border-gray-200 bg-gray-100"
                    : "border-black bg-black text-white hover:bg-white hover:text-black"
                }  h-9 w-40 rounded-md border text-sm transition-all duration-150 ease-in-out focus:outline-none`}
              >
                {clicked ? <LoadingDots /> : "Manage Subscription"}
              </button>
            </div>
          )
        ) : (
          <div className="h-9 w-24 animate-pulse rounded-md bg-gray-200" />
        )}
      </div>
    </div>
  );
}
