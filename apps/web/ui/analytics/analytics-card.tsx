import useWorkspace from "@/lib/swr/use-workspace";
import { Modal, TabSelect } from "@dub/ui";
import { Crosshairs, CursorRays, InvoiceDollar } from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import {
  ComponentType,
  Dispatch,
  ReactNode,
  SVGProps,
  SetStateAction,
  useContext,
  useMemo,
  useState,
} from "react";
import { AnalyticsContext } from ".";

type EventType = "clicks" | "leads" | "sales";

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
    event: EventType;
    setShowModal: (show: boolean) => void;
  }) => ReactNode;
  className?: string;
}) {
  const { demo } = useContext(AnalyticsContext);
  const { betaTester } = useWorkspace();

  const [showModal, setShowModal] = useState(false);

  const eventTabs: {
    id: EventType;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    label: string;
  }[] = useMemo(
    () =>
      demo || betaTester
        ? [
            { id: "clicks", icon: CursorRays, label: "Clicks" },
            { id: "leads", icon: Crosshairs, label: "Leads" },
            { id: "sales", icon: InvoiceDollar, label: "Sales" },
          ]
        : [{ id: "clicks", icon: CursorRays, label: "Clicks" }],
    [demo, betaTester],
  );

  const [eventTab, setEventTab] = useState<EventType>("clicks");

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
        {children({ event: eventTab, setShowModal })}
      </Modal>
      <div
        className={cn(
          "relative z-0 max-h-[520px] min-h-[320px] overflow-hidden border border-gray-200 bg-white sm:rounded-xl",
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

          {/* Event (clicks, leads, sales) tabs */}
          <div className="flex gap-2">
            {eventTabs.map(({ id, icon: Icon, label }) => (
              <button
                onClick={() => setEventTab(id)}
                title={label}
                className={cn(
                  "rounded-md border border-white p-2",
                  id === eventTab
                    ? "border-gray-200 bg-gray-100"
                    : "hover:bg-gray-100 active:border-gray-100",
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
        <div className="py-4">
          {children({ limit: expandLimit, event: eventTab, setShowModal })}
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
