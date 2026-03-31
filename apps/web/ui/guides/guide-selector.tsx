import { Popover } from "@dub/ui";
import { Check2 } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { IntegrationGuide } from "./integrations";

interface GuideSelectorProps {
  value: IntegrationGuide | null;
  guides: IntegrationGuide[];
  onChange: (guide: IntegrationGuide) => void;
  disabled?: boolean;
  className?: string;
}

const GuideSelectorIcon = ({
  icon: Icon,
  fullSize,
}: { icon: any } & IntegrationGuide["iconProps"]) => {
  const containerClassName =
    "size-8 shrink-0 overflow-hidden rounded-lg bg-white";

  if (fullSize) {
    return <Icon className={containerClassName} width="auto" height="100%" />;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center border border-neutral-200",
        containerClassName,
      )}
    >
      <Icon className="size-5" />
    </div>
  );
};

export function GuideSelector({
  value,
  guides,
  onChange,
  disabled,
  className,
}: GuideSelectorProps) {
  const [openPopover, setOpenPopover] = useState(false);

  return (
    <Popover
      content={
        <GuideList
          selected={value}
          guides={guides}
          onChange={onChange}
          setOpenPopover={setOpenPopover}
        />
      }
      side="bottom"
      align="start"
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
      popoverContentClassName="min-w-[280px]"
    >
      <button
        onClick={() => setOpenPopover(!openPopover)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-x-2 rounded-lg px-2 py-1 text-left text-sm transition-all duration-75",
          "hover:bg-neutral-200/50 active:bg-neutral-200/80 data-[state=open]:bg-neutral-200/50",
          "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        {value ? (
          <>
            <GuideSelectorIcon icon={value.icon} {...(value.iconProps || {})} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-neutral-900">
                {value.title}
              </div>
              {value.subtitle && (
                <div className="truncate text-xs text-neutral-500">
                  {value.subtitle}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-neutral-500">Select a guide</div>
        )}
        <ChevronDown className="size-4 shrink-0 text-neutral-400" />
      </button>
    </Popover>
  );
}

function GuideList({
  selected,
  guides,
  onChange,
  setOpenPopover,
}: {
  selected: IntegrationGuide | null;
  guides: IntegrationGuide[];
  onChange: (guide: IntegrationGuide) => void;
  setOpenPopover: (open: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5 p-2">
      {guides.map((guide) => {
        const isActive = selected?.key === guide.key;
        return (
          <button
            key={guide.key}
            className={cn(
              "relative flex w-full items-center gap-x-2 rounded-md px-2 py-1 text-left transition-all duration-75",
              "hover:bg-neutral-200/50 active:bg-neutral-200/80",
              "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
              isActive && "bg-neutral-200/50",
            )}
            onClick={() => {
              onChange(guide);
              setOpenPopover(false);
            }}
          >
            <GuideSelectorIcon icon={guide.icon} {...(guide.iconProps || {})} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-x-2">
                <span className="block truncate text-sm font-medium leading-5 text-neutral-900">
                  {guide.title}
                </span>
                {guide.recommended && (
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Recommended
                  </span>
                )}
              </div>
              {guide.subtitle && (
                <div className="mt-0.5 truncate text-xs text-neutral-500">
                  {guide.subtitle}
                </div>
              )}
            </div>
            {isActive && (
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-black">
                <Check2 className="size-4" aria-hidden="true" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
