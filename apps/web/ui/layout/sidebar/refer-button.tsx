"use client";

import { useLocalStorage, useMediaQuery } from "@dub/ui";
import { Gift } from "@dub/ui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AffiliateProgramPopup } from "./affiliate-program-popup";

export function ReferButton({
  affiliatePopupEnabled = false,
}: {
  affiliatePopupEnabled?: boolean;
}) {
  const { width } = useMediaQuery();
  const [linkRef, setLinkRef] = useState<HTMLAnchorElement | null>(null);

  return (
    <>
      <Link
        ref={affiliatePopupEnabled ? setLinkRef : undefined}
        href="/account/settings/referrals"
        className="animate-fade-in size-4 shrink-0 rounded-full"
      >
        <Gift className="size-4" />
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
