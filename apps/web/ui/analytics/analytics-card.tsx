import { EventType } from "@/lib/analytics/types";
import {
  AnimatedSizeContainer,
  Button,
  Modal,
  Popover,
  TabSelect,
  ToggleGroup,
  useMediaQuery,
} from "@dub/ui";
import { CursorRays, InvoiceDollar, UserCheck } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { ChevronsUpDown } from "lucide-react";
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
  subTabs,
  selectedSubTabId,
  onSelectSubTab,
  expandLimit,
  hasMore,
  children,
  className,
}: {
  tabs: { id: T; label: string; icon: React.ElementType }[];
  selectedTabId: T;
  onSelectTab?: Dispatch<SetStateAction<T>> | ((tabId: T) => void);
  subTabs?: { id: string; label: string }[];
  selectedSubTabId?: string;
  onSelectSubTab?:
    | Dispatch<SetStateAction<string>>
    | ((subTabId: string) => void);
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
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h1 className="text-lg font-semibold">{selectedTab?.label}</h1>
          <div className="flex items-center gap-1 text-neutral-500">
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
        {subTabs && selectedSubTabId && onSelectSubTab && (
          <SubTabs
            subTabs={subTabs}
            selectedTab={selectedSubTabId}
            onSelectTab={onSelectSubTab}
          />
        )}
        {children({ setShowModal, event })}
      </Modal>
      <div
        className={cn(
          "group relative z-0 h-[400px] overflow-hidden border border-neutral-200 bg-white sm:rounded-xl",
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-4">
          {/* Main tabs */}
          {isMobile ? (
            <Popover
              openPopover={isOpen}
              setOpenPopover={setIsOpen}
              content={
                <div className="grid w-full gap-px p-2 sm:w-48">
                  {tabs.map(({ id, label, icon: Icon }) => (
                    <Button
                      key={id}
                      text={label}
                      variant="outline"
                      onClick={() => {
                        onSelectTab?.(id);
                        setIsOpen(false);
                      }}
                      icon={<Icon className="size-4" />}
                      className={cn(
                        "h-9 w-full justify-start px-2 font-medium",
                        selectedTabId === id && "bg-neutral-100",
                      )}
                    />
                  ))}
                </div>
              }
              align="end"
            >
              <Button
                type="button"
                className="my-2 h-8 w-fit whitespace-nowrap px-2"
                variant="outline"
                icon={<SelectedTabIcon className="size-4" />}
                text={selectedTab.label}
                right={
                  <ChevronsUpDown
                    className="size-4 shrink-0 text-neutral-400"
                    aria-hidden="true"
                  />
                }
              />
            </Popover>
          ) : (
            <TabSelect
              options={tabs}
              selected={selectedTabId}
              onSelect={onSelectTab}
            />
          )}

          <div className="flex items-center gap-1 pr-2 text-neutral-500">
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
        <AnimatedSizeContainer
          height
          transition={{ ease: "easeInOut", duration: 0.2 }}
        >
          {subTabs && selectedSubTabId && onSelectSubTab && (
            <SubTabs
              subTabs={subTabs}
              selectedTab={selectedSubTabId}
              onSelectTab={onSelectSubTab}
            />
          )}
        </AnimatedSizeContainer>
        <div className="py-4">
          {children({
            limit: expandLimit,
            event,
            setShowModal,
          })}
        </div>
        {hasMore && (
          <div className="absolute bottom-0 left-0 z-10 flex w-full items-end">
            <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-full bg-gradient-to-t from-white" />
            <button
              onClick={() => setShowModal(true)}
              className="group relative flex w-full items-center justify-center py-4"
            >
              <div className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-sm text-neutral-950 group-hover:bg-neutral-100 group-active:border-neutral-300">
                View All
              </div>
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function SubTabs({
  subTabs,
  selectedTab,
  onSelectTab,
}: {
  subTabs: { id: string; label: string }[];
  selectedTab: string;
  onSelectTab: (key: string) => void;
}) {
  return (
    <ToggleGroup
      key={JSON.stringify(subTabs)}
      options={subTabs.map(({ id, label }) => ({
        value: id,
        label: label,
      }))}
      selected={selectedTab}
      selectAction={(period) => onSelectTab(period)}
      className="flex w-full flex-wrap rounded-none border-x-0 border-t-0 border-neutral-200 bg-neutral-50 px-6 py-2.5 sm:flex-nowrap"
      optionClassName="text-xs px-2 font-normal hover:text-neutral-700"
      indicatorClassName="border-0 bg-neutral-200 rounded-md"
    />
  );
}
