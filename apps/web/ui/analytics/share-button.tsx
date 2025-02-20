import { Button, ReferredVia, useMediaQuery } from "@dub/ui";
import { memo, useContext } from "react";
import { useShareDashboardModal } from "../modals/share-dashboard-modal";
import { AnalyticsContext } from "./analytics-provider";

export function ShareButton() {
  const { domain, key } = useContext(AnalyticsContext);

  return domain && key ? <ShareButtonInner domain={domain} _key={key} /> : null;
}

const ShareButtonInner = memo(
  ({ domain, _key }: { domain: string; _key: string }) => {
    const { ShareDashboardModal, setShowShareDashboardModal } =
      useShareDashboardModal({ domain, _key });
    const { isMobile } = useMediaQuery();
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
