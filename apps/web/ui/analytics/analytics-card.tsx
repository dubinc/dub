import { EventType } from "@/lib/analytics/types";
import { Button, Modal, Popover, TabSelect, useMediaQuery } from "@dub/ui";
import { CursorRays, InvoiceDollar, UserCheck } from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import { Command } from "cmdk";
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
  tabs: { id: T; label: string; icon: React.ElementType }[];
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
  const [isOpen, setIsOpen] = useState(false);

  const selectedTab = tabs.find(({ id }) => id === selectedTabId) || tabs[0];
  const SelectedTabIcon = selectedTab.icon;
  const { isMobile } = useMediaQuery();

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
          "relative z-0 h-[400px] overflow-hidden border border-gray-200 bg-white sm:rounded-xl",
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4">
          {/* Main tabs */}
          {isMobile ? (
            <Popover
              openPopover={isOpen}
              setOpenPopover={setIsOpen}
              content={
                <Command tabIndex={0} loop className="focus:outline-none">
                  <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm sm:w-auto sm:min-w-[130px]">
                    {tabs.map(({ id, label, icon: Icon }) => (
                      <Command.Item
                        className={cn(
                          "flex cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-md p-2 text-sm text-neutral-600",
                          "data-[selected=true]:bg-gray-100",
                        )}
                        onSelect={() => {
                          onSelectTab?.(id);
                          setIsOpen(false);
                        }}
                      >
                        {<Icon className="size-4" />}
                        {label}
                      </Command.Item>
                    ))}
                  </Command.List>
                </Command>
              }
              align="end"
            >
              <Button
                type="button"
                className="my-2 h-8 w-fit whitespace-nowrap px-2"
                variant="outline"
                icon={<SelectedTabIcon className="size-4" />}
                text={selectedTab.label}
              />
            </Popover>
          ) : (
            <TabSelect
              options={tabs}
              selected={selectedTabId}
              onSelect={onSelectTab}
            />
          )}

          <div className="flex items-center gap-1 pr-2 text-gray-500">
            {event === "sales" ? (
              <InvoiceDollar className="hidden h-4 w-4 sm:block" />
            ) : event === "leads" ? (
              <UserCheck className="hidden h-4 w-4 sm:block" />
            ) : (
              <CursorRays className="hidden h-4 w-4 sm:block" />
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
