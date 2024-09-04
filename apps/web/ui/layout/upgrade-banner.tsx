"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { useMediaQuery } from "@dub/ui";
import Cookies from "js-cookie";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ProBanner from "../workspaces/pro-banner";

export default function UpgradeBanner() {
  const { slug } = useParams() as { slug?: string };

  const { id, name, plan, stripeId, createdAt } = useWorkspace();
  const [showProBanner, setShowProBanner] = useState<boolean | null>(null);

  const { isMobile } = useMediaQuery();

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

  return (
    <>
      {!isMobile && showProBanner && (
        <ProBanner setShowProBanner={setShowProBanner} />
      )}
      {plan === "free" && (isMobile || showProBanner === false) && (
        <Link
          href={`/${slug}/upgrade`}
          className="transition-all duration-75 active:scale-95"
        >
          <span className="bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-sm text-transparent">
            Upgrade
          </span>
        </Link>
      )}
    </>
  );
}
