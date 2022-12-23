import { useRouter } from "next/router";
import { useState } from "react";
import toast from "react-hot-toast";
import useSWR from "swr";
import { Chart, LoadingDots } from "@/components/shared/icons";
import Tooltip, { TooltipContent } from "@/components/shared/tooltip";
import useProject from "@/lib/swr/use-project";
import useUsage from "@/lib/swr/use-usage";
import { fetcher, nFormatter } from "@/lib/utils";
import Link from "next/link";

export default function LandingPage() {
  const router = useRouter();
  const { slug } = router.query as { slug: string };

  const { project: { domain, domainVerified } = {}, isOwner } = useProject();

  const { plan } = useUsage();

  const { data: rootDomain } = useSWR<string>(
    slug && domain && `/api/projects/${slug}/domains/${domain}/root`,
    fetcher,
  );

  const { data: clicks } = useSWR<string>(
    slug && domain && `/api/projects/${slug}/domains/${domain}/root/clicks`,
    fetcher,
  );

  const [saving, setSaving] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSaving(true);
        fetch(`/api/projects/${slug}/domains/${domain}/root`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // @ts-ignore
            rootDomain: e.target.root.value,
          }),
        }).then(async (res) => {
          setSaving(false);
          if (res.status === 200) {
            toast.success("Successfully updated landing page");
          }
        });
      }}
      className="rounded-lg border border-gray-200 bg-white"
    >
      <div className="relative flex flex-col space-y-3 p-5 sm:p-10">
        <h2 className="text-xl font-medium">Landing Page</h2>
        <div className="flex items-center space-x-1">
          <p className="text-sm text-gray-500">
            Configure a page to redirect visitors when they land on{" "}
            <a
              href={`https://${domain}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-blue-800 transition-all hover:text-black"
            >
              {domain}
            </a>
          </p>
          {domainVerified && (
            <Link
              href={`/${slug}/_root`}
              className="flex items-center space-x-1 rounded-md bg-gray-100 px-2 py-0.5 transition-all duration-75 hover:scale-105 active:scale-95"
            >
              <Chart className="h-4 w-4" />
              <p className="text-sm text-gray-500">
                {!clicks ? (
                  <LoadingDots color="#71717A" />
                ) : (
                  nFormatter(parseInt(clicks))
                )}{" "}
                clicks
              </p>
            </Link>
          )}
        </div>
        <div />
        {plan !== "Free" ? (
          <input
            type="url"
            name="root"
            id="root"
            placeholder="https://yourdomain.com"
            required
            defaultValue={rootDomain}
            className="w-full max-w-md rounded-md border border-gray-300 text-sm text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500"
          />
        ) : (
          <Tooltip
            content={
              <TooltipContent
                title={`You can't configure a custom landing page on a free plan. ${
                  isOwner
                    ? "Upgrade to a Pro plan to proceed."
                    : "Ask your project owner to upgrade to a Pro plan."
                }`}
                cta={isOwner && "Upgrade to Pro"}
                ctaLink={isOwner && "/settings"}
              />
            }
          >
            <div className="w-full max-w-md cursor-not-allowed rounded-md border border-gray-300 px-3 py-2 text-left text-sm text-gray-300">
              https://yourdomain.com
            </div>
          </Tooltip>
        )}
      </div>

      <div className="border-b border-gray-200" />

      <div className="px-5 py-4 sm:flex sm:items-center sm:justify-end sm:px-10">
        {plan !== "Free" ? (
          <button
            disabled={saving}
            className={`${
              saving
                ? "cursor-not-allowed border-gray-200 bg-gray-100"
                : "border-black bg-black hover:bg-white hover:text-black"
            } h-9 w-full rounded-md border text-sm text-white transition-all duration-150 ease-in-out focus:outline-none sm:w-32`}
          >
            {saving ? <LoadingDots /> : "Save Changes"}
          </button>
        ) : (
          <Tooltip
            content={
              <TooltipContent
                title={`You can't configure a custom landing page on a free plan. ${
                  isOwner
                    ? "Upgrade to a Pro plan to proceed."
                    : "Ask your project owner to upgrade to a Pro plan."
                }`}
                cta={isOwner && "Upgrade to Pro"}
                ctaLink={isOwner && "/settings"}
              />
            }
            fullWidth
          >
            <div className="flex h-9 w-full cursor-not-allowed items-center justify-center rounded-md border border-gray-200 bg-gray-100 text-sm text-gray-300 sm:w-32">
              Save Changes
            </div>
          </Tooltip>
        )}
      </div>
    </form>
  );
}
