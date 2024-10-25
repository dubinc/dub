import { EventType } from "@/lib/analytics/types";
import { Modal, TabSelect } from "@dub/ui";
import { CursorRays, InvoiceDollar, UserCheck } from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useState,
} from "react";
import { AnalyticsContext } from "./analytics-provider";

export function AnalyticsCard<T extends string>({
  tabs,
  selectedTabId,
  onSelectTab,
  expandLimit,
  hasMore,
  children,
  className,
}: {
  tabs: { id: T; label: string }[];
  selectedTabId: T;
  onSelectTab?: Dispatch<SetStateAction<T>> | ((tabId: T) => void);
  expandLimit: number;
  hasMore?: boolean;
  children: (props: {
    limit?: number;
    event?: EventType;
    setShowModal: (show: boolean) => void;
  }) => ReactNode;
  className?: string;
}) {
  const { selectedTab: event } = useContext(AnalyticsContext);

  const [showModal, setShowModal] = useState(false);

  const selectedTab = tabs.find(({ id }) => id === selectedTabId);

  return (
    <>
      <Modal
        showModal={showModal}
        setShowModal={setShowModal}
        className="max-w-lg px-0"
      >
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-lg font-semibold">{selectedTab?.label}</h1>
        </div>
        {children({ setShowModal, event })}
      </Modal>
      <div
        className={cn(
          "relative z-0 max-h-[520px] min-h-[300px] overflow-hidden border border-gray-200 bg-white sm:rounded-xl",
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4">
          {/* Main tabs */}
          <TabSelect
            options={tabs}
            selected={selectedTabId}
            onSelect={onSelectTab}
          />

          <div className="flex items-center gap-1 pr-2 text-gray-500">
            {event === "sales" ? (
              <InvoiceDollar className="h-4 w-4" />
            ) : event === "leads" ? (
              <UserCheck className="h-4 w-4" />
            ) : (
              <CursorRays className="h-4 w-4" />
            )}
            <p className="text-xs uppercase">{event}</p>
          </div>
        </div>
        <div className="py-4">
          {children({ limit: expandLimit, event, setShowModal })}
        </div>
        {hasMore && (
          <div className="absolute bottom-0 left-0 z-10 flex w-full items-end">
            <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-full bg-gradient-to-t from-white" />
            <button
              onClick={() => setShowModal(true)}
              className="group relative flex w-full items-center justify-center py-4"
            >
              <div className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-sm text-gray-950 group-hover:bg-gray-100 group-active:border-gray-300">
                View All
              </div>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
