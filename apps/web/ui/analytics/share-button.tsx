import { useCheckFolderPermission } from "@/lib/swr/use-folder-permissions";
import { Button, ReferredVia, useMediaQuery } from "@dub/ui";
import { useSearchParams } from "next/navigation";
import { memo, useContext } from "react";
import {
  ShareDashboardModalInnerProps,
  useShareDashboardModal,
} from "../modals/share-dashboard-modal";
import { AnalyticsContext } from "./analytics-provider";

export function ShareButton() {
  const searchParams = useSearchParams();
  const { domain, key, folderId, partnerPage } = useContext(AnalyticsContext);

  const canUpdateFolder = useCheckFolderPermission(
    folderId ?? null,
    "folders.write",
  );

  if (partnerPage) return null;

  const linkId = searchParams.get("linkId");

  return linkId && !linkId.includes(",") ? (
    <ShareButtonInner linkId={linkId} />
  ) : domain && key ? (
    <ShareButtonInner domain={domain} _key={key} />
  ) : folderId && !folderId.includes(",") && canUpdateFolder ? (
    <ShareButtonInner folderId={folderId} />
  ) : null;
}

const ShareButtonInner = memo(
  ({ linkId, domain, _key, folderId }: ShareDashboardModalInnerProps) => {
    const { isMobile } = useMediaQuery();
    const { ShareDashboardModal, setShowShareDashboardModal } =
      useShareDashboardModal(
        linkId
          ? { linkId }
          : domain && _key
            ? { domain, _key }
            : { folderId: folderId! },
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
