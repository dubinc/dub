"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { Badge, useRouterStuff } from "@dub/ui";
import Cookies from "js-cookie";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ProBanner from "../workspaces/pro-banner";

export default function UpgradeBanner() {
  const { slug } = useParams() as { slug?: string };

  const { id, name, plan, stripeId, createdAt } = useWorkspace();
  const [showProBanner, setShowProBanner] = useState<boolean | null>(null);

  useEffect(() => {
    if (plan) {
      /* show pro banner if:
          - free plan
          - not hidden by user for this workspace 
          - workspace is created more than 24 hours ago
      */
      if (
        plan === "free" &&
        Cookies.get("hideProBanner") !== slug &&
        createdAt &&
        Date.now() - new Date(createdAt).getTime() > 24 * 60 * 60 * 1000
      ) {
        setShowProBanner(true);
      } else {
        setShowProBanner(false);
      }
    } else {
      setShowProBanner(false);
    }
  }, [plan, id, name, slug, stripeId, createdAt]);

  const { queryParams } = useRouterStuff();

  return (
    <>
      {showProBanner && <ProBanner setShowProBanner={setShowProBanner} />}
      {plan === "free" && showProBanner === false && (
        <button
          onClick={() =>
            queryParams({
              set: {
                upgrade: "pro",
              },
            })
          }
          className="mb-1 ml-3 hidden sm:block"
        >
          <Badge variant="rainbow" className="px-3 py-1">
            Upgrade
          </Badge>
        </button>
      )}
    </>
  );
}
