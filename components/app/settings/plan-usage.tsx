import useSWR from "swr";
import { useMemo, useState } from "react";
import { fetcher, nFormatter } from "@/lib/utils";
import { useRouter } from "next/router";
import Tooltip from "@/components/shared/tooltip";
import {
  Divider,
  Infinity,
  QuestionCircle,
  LoadingDots,
} from "@/components/shared/icons";
import { motion } from "framer-motion";
import { getStripe } from "@/lib/stripe/client";
import useProject from "@/lib/swr/use-project";
import useUsage from "@/lib/swr/use-usage";

export default function PlanUsage() {
  const router = useRouter();
  const { slug } = router.query as { slug: string };

  const { project } = useProject();
  const { usage } = useUsage(project);

  const { data: linkCount } = useSWR<number>(
    project && `/api/projects/${slug}/domains/${project.domain}/links/count`,
    fetcher
  );

  const [clicked, setClicked] = useState(false);

  const [billingStart, billingEnd] = useMemo(() => {
    if (project?.lastBilled) {
      const lastBilledDate = new Date(project.lastBilled);
      const start = lastBilledDate.toLocaleDateString("en-us", {
        month: "short",
        day: "numeric",
      });
      const end = new Date(
        lastBilledDate.setDate(lastBilledDate.getDate() + 30)
      ).toLocaleDateString("en-us", {
        month: "short",
        day: "numeric",
      });
      return [start, end];
    }
    return ["", ""];
  }, [project?.lastBilled]);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="flex flex-col space-y-3 p-10">
        <h2 className="text-xl font-medium">Plan &amp; Usage</h2>
        <p className="text-gray-500 text-sm">
          You are currently on the{" "}
          {project ? (
            <span
              className={`capitalize ${
                project.plan === "enterprise"
                  ? "bg-violet-600 border-violet-600 text-white"
                  : project.plan === "pro"
                  ? "bg-blue-500 border-blue-500 text-white"
                  : "bg-black border-black text-white"
              } border rounded-full px-2 py-0.5 text-xs font-medium`}
            >
              {project.plan}
            </span>
          ) : (
            <span className="bg-gray-200 text-gray-200 rounded-full px-2 py-0.5 text-xs">
              load
            </span>
          )}{" "}
          plan.
          {project?.plan !== "free" && (
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
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
        <div className="p-10 flex flex-col space-y-2">
          <div className="flex items-center">
            <h3 className="font-medium">Link Clicks</h3>
            <Tooltip content="Number of link clicks that your project has had this month.">
              <div className="flex justify-center w-8 h-4">
                <QuestionCircle className="w-4 h-4 text-gray-600" />
              </div>
            </Tooltip>
          </div>
          {typeof usage === "number" ? (
            <p className="text-sm text-gray-600">
              {nFormatter(usage)} / {nFormatter(project.usageLimit)} clicks (
              {((usage / project.usageLimit) * 100).toFixed(1)}%)
            </p>
          ) : (
            <div className="h-5 w-32 bg-gray-200 rounded-md animate-pulse" />
          )}
          <div className="bg-gray-200 rounded-full h-3 w-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width:
                  project && usage
                    ? (usage / project.usageLimit) * 100 + "%"
                    : "0%",
              }}
              transition={{ duration: 0.5, type: "spring" }}
              className={`${
                usage > project?.usageLimit ? "bg-red-500" : "bg-blue-500"
              } rounded-full h-3`}
            />
          </div>
        </div>
        <div className="p-10">
          <h3 className="font-medium">Number of Links</h3>
          <div className="flex items-center mt-4">
            {typeof linkCount === "number" ? (
              <p className="text-2xl font-semibold text-black">
                {nFormatter(linkCount)}
              </p>
            ) : (
              <div className="w-8 h-8 bg-gray-200 rounded-md animate-pulse" />
            )}
            <Divider className="w-8 h-8 text-gray-500" />
            <Infinity className="w-8 h-8 text-gray-500" />
          </div>
        </div>
      </div>
      <div className="border-b border-gray-200" />
      <div className="px-10 py-5 flex justify-between items-center">
        {project?.plan === "free" ? (
          <p className="text-gray-500 text-sm">
            For{" "}
            <Tooltip content="1 million link clicks per month">
              <span className="font-medium text-gray-700 underline underline-offset-2 cursor-default hover:text-black">
                increased limits
              </span>
            </Tooltip>
            , upgrade to the Pro plan.
          </p>
        ) : project?.plan === "pro" ? (
          <p className="text-gray-500 text-sm">
            To remove limits, contact us to upgrade to the Enterprise plan.
          </p>
        ) : (
          <div className="h-3 w-28 bg-gray-200 rounded-full animate-pulse" />
        )}
        {project ? (
          project.plan === "free" ? (
            <button
              onClick={() => {
                setClicked(true);
                fetch(`/api/projects/${slug}/upgrade`, {
                  method: "POST",
                })
                  .then(async (res) => {
                    const data = await res.json();
                    const { id: sessionId } = data;
                    const stripe = await getStripe();
                    stripe.redirectToCheckout({ sessionId });
                  })
                  .catch((err) => {
                    alert(err);
                    setClicked(false);
                  });
              }}
              disabled={clicked}
              className={`${
                clicked
                  ? "cursor-not-allowed bg-gray-100 border-gray-200"
                  : "bg-blue-500 text-white border-blue-500 hover:text-blue-500 hover:bg-white"
              }  h-9 w-24 text-sm border rounded-md focus:outline-none transition-all ease-in-out duration-150`}
            >
              {clicked ? <LoadingDots /> : "Upgrade"}
            </button>
          ) : project.plan === "pro" ? (
            <div className="flex space-x-3">
              <a
                href="mailto:steven@dub.sh?subject=Upgrade%20to%20Enterprise%20Plan"
                className="flex justify-center items-center bg-violet-600 text-white border-violet-600 hover:text-violet-600 hover:bg-white h-9 w-24 text-sm border rounded-md focus:outline-none transition-all ease-in-out duration-150"
              >
                Contact Us
              </a>
              <button
                onClick={() => {
                  setClicked(true);
                  fetch(`/api/projects/${slug}/manage-subscription`, {
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
                    ? "cursor-not-allowed bg-gray-100 border-gray-200"
                    : "bg-black text-white border-black hover:text-black hover:bg-white"
                }  h-9 w-40 text-sm border rounded-md focus:outline-none transition-all ease-in-out duration-150`}
              >
                {clicked ? <LoadingDots /> : "Manage Subscription"}
              </button>
            </div>
          ) : null
        ) : (
          <div className="h-9 w-24 bg-gray-200 rounded-md animate-pulse" />
        )}
      </div>
    </div>
  );
}
