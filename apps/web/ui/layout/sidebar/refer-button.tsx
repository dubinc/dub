"use client";

import { useLocalStorage, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils/src";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AffiliateProgramPopup } from "./affiliate-program-popup";
import { Gift } from "./icons/gift";

export function ReferButton({
  affiliatePopupEnabled = false,
}: {
  affiliatePopupEnabled?: boolean;
}) {
  const { width } = useMediaQuery();
  const [linkRef, setLinkRef] = useState<HTMLAnchorElement | null>(null);
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <Link
        ref={affiliatePopupEnabled ? setLinkRef : undefined}
        href="/account/settings/referrals"
        aria-label="Referrals"
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={(e) =>
          e.currentTarget.matches(":focus-visible") && setHovered(true)
        }
        onBlur={() => setHovered(false)}
        className={cn(
          "animate-fade-in hover:bg-bg-inverted/5 active:bg-bg-inverted/10 flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors duration-150",
          "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
        )}
      >
        <Gift className="text-content-default size-5" data-hovered={hovered} />
      </Link>
      {affiliatePopupEnabled && width && width >= 768 && (
        <AffiliateProgramPopupWrapper referenceElement={linkRef} />
      )}
    </>
  );
}

function AffiliateProgramPopupWrapper({
  referenceElement,
}: {
  referenceElement: HTMLAnchorElement | null;
}) {
  const router = useRouter();

  const [show, setShow] = useLocalStorage(`show-affiliate-program-popup`, true);

  if (!show) return null;

  return (
    <AffiliateProgramPopup
      referenceElement={referenceElement}
      onCTA={() => {
        setShow(false);
        router.push("/account/settings/referrals");
      }}
      onDismiss={() => setShow(false)}
    />
  );
}
