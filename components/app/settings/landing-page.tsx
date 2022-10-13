import { useRouter } from "next/router";
import { useState } from "react";
import toast from "react-hot-toast";
import useSWR from "swr";
import { Chart, LoadingDots } from "@/components/shared/icons";
import Tooltip, { TooltipContent } from "@/components/shared/tooltip";
import useProject from "@/lib/swr/use-project";
import useUsage from "@/lib/swr/use-usage";
import { fetcher, nFormatter } from "@/lib/utils";

export default function DefaultPage() {
  const router = useRouter();
  const { slug } = router.query as { slug: string };

  const { project: { domain, domainVerified } = {}, isOwner } = useProject();

  const { plan } = useUsage();

  const { data: rootDomain } = useSWR<string>(
    slug && domain && `/api/projects/${slug}/domains/${domain}/root`,
    fetcher,
  );

  const { data: clicks, isValidating } = useSWR<string>(
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
      className="bg-white rounded-lg border border-gray-200"
    >
      <div className="flex flex-col space-y-3 p-10">
        <h2 className="text-xl font-medium">Landing Page</h2>
        <div className="h-7 flex items-center space-x-1">
          <p className="text-gray-500 text-sm">
            Configure a page to redirect visitors when they land on
          </p>
          <a
            href={`https://${domain}`}
            target="_blank"
            rel="noreferrer"
            className="text-blue-800 font-semibold text-sm hover:text-black transition-all"
          >
            {domain}
          </a>
          {domainVerified && (
            <div className="flex items-center space-x-1 rounded-md bg-gray-100 px-2 py-0.5 cursor-default">
              <Chart className="w-4 h-4" />
              <p className="text-sm text-gray-500">
                {isValidating || !clicks ? (
                  <LoadingDots color="#71717A" />
                ) : (
                  nFormatter(parseInt(clicks))
                )}{" "}
                clicks
              </p>
            </div>
          )}
        </div>
        <div />
        {domainVerified && plan !== "Free" ? (
          <input
            type="url"
            name="root"
            id="root"
            placeholder="https://yourdomain.com"
            required
            defaultValue={rootDomain}
            className="border border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:ring-gray-500 w-full max-w-md rounded-md focus:outline-none text-sm"
          />
        ) : (
          <Tooltip
            content={
              !domainVerified ? (
                "You need to verify your domain first."
              ) : (
                <TooltipContent
                  title={`You can't configure a custom landing page on a free plan. ${
                    isOwner
                      ? "Upgrade to a Pro plan to proceed."
                      : "Ask your project owner to upgrade to a Pro plan."
                  }`}
                  cta={isOwner && "Upgrade to Pro"}
                  ctaLink={isOwner && "/settings"}
                />
              )
            }
          >
            <div className="text-left border border-gray-300 text-gray-300 text-sm px-3 py-2 w-full max-w-md cursor-not-allowed rounded-md">
              https://yourdomain.com
            </div>
          </Tooltip>
        )}
      </div>

      <div className="border-b border-gray-200" />

      <div className="px-10 py-4 flex justify-end items-center">
        {domainVerified && plan !== "Free" ? (
          <button
            disabled={saving}
            className={`${
              saving
                ? "cursor-not-allowed bg-gray-100 border-gray-200"
                : "bg-black border-black hover:text-black hover:bg-white"
            } text-white h-9 w-32 text-sm border rounded-md focus:outline-none transition-all ease-in-out duration-150`}
          >
            {saving ? <LoadingDots /> : "Save Changes"}
          </button>
        ) : (
          <Tooltip
            content={
              !domainVerified ? (
                "You need to verify your domain first."
              ) : (
                <TooltipContent
                  title={`You can't configure a custom landing page on a free plan. ${
                    isOwner
                      ? "Upgrade to a Pro plan to proceed."
                      : "Ask your project owner to upgrade to a Pro plan."
                  }`}
                  cta={isOwner && "Upgrade to Pro"}
                  ctaLink={isOwner && "/settings"}
                />
              )
            }
          >
            <div className="cursor-not-allowed bg-gray-100 border-gray-200 text-gray-300 h-9 w-32 flex items-center justify-center text-sm border rounded-md">
              Save Changes
            </div>
          </Tooltip>
        )}
      </div>
    </form>
  );
}
