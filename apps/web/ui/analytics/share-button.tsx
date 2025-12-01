import { Button, ReferredVia, useMediaQuery } from "@dub/ui";
import { memo, useContext } from "react";
import { useShareDashboardModal } from "../modals/share-dashboard-modal";
import { AnalyticsContext } from "./analytics-provider";

export function ShareButton() {
  const { domain, key, folderId, partnerPage } = useContext(AnalyticsContext);

  if (partnerPage) return null;

  return domain && key ? (
    <ShareButtonInner domain={domain} _key={key} />
  ) : folderId ? (
    <ShareButtonInner folderId={folderId} />
  ) : null;
}

const ShareButtonInner = memo(
  ({
    domain,
    _key,
    folderId,
  }:
    | { domain: string; _key: string; folderId?: never }
    | { folderId: string; domain?: never; _key?: never }) => {
    const { isMobile } = useMediaQuery();
    const { ShareDashboardModal, setShowShareDashboardModal } =
      useShareDashboardModal(
        domain && _key ? { domain, _key } : { folderId: folderId! },
      );

    return (
      <>
        <ShareDashboardModal />
        <Button
          variant="secondary"
          onClick={() => setShowShareDashboardModal(true)}
          icon={<ReferredVia className="size-4" />}
          text={isMobile ? undefined : "Share"}
          className="animate-fade-in w-fit"
        />
      </>
    );
  },
);
