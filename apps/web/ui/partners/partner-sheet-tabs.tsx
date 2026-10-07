import { usePartnerCommentsCount } from "@/lib/swr/use-partner-comments-count";
import { SheetTabs, formatTabBadgeCount } from "@/ui/shared/sheet-tabs";
import { Msg, User } from "@dub/ui";
import { Dispatch, SetStateAction, useMemo } from "react";

export function PartnerSheetTabs({
  partnerId,
  currentTabId,
  setCurrentTabId,
}: {
  partnerId: string;
  currentTabId: string;
  setCurrentTabId: Dispatch<SetStateAction<string>>;
}) {
  const { count: commentsCount } = usePartnerCommentsCount(
    {
      partnerId,
    },
    {
      keepPreviousData: true,
    },
  );

  const tabs = useMemo(
    () => [
      {
        id: "about",
        label: "About",
        icon: User,
      },
      {
        id: "comments",
        label: "Comments",
        badge: formatTabBadgeCount(commentsCount),
        icon: Msg,
      },
    ],
    [commentsCount],
  );

  return (
    <SheetTabs
      tabs={tabs}
      currentTabId={currentTabId}
      setCurrentTabId={setCurrentTabId}
    />
  );
}
