import { Combobox, ComboboxOption } from "@dub/ui";
import { cn } from "@dub/utils";
import { useMemo, useState } from "react";
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
  className,
}: { icon: any; className?: string } & IntegrationGuide["iconProps"]) => {
  const containerClassName =
    "size-8 shrink-0 overflow-hidden rounded-lg bg-white";
  if (fullSize) {
    return (
      <Icon className={cn(containerClassName)} width="auto" height="100%" />
    );
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
  // return (
  //   <div
  //     className={cn(
  //       "flex aspect-square grow items-center justify-center self-stretch ",
  //       className,
  //     )}
  //   >
  //     <Icon
  //       className={cn("h-full w-full object-contain", fullSize ? "" : "p-1")}
  //     />
  //   </div>
  // );
};

export function GuideSelector({
  value,
  guides,
  onChange,
  disabled,
  className,
}: GuideSelectorProps) {
  const [openPopover, setOpenPopover] = useState(false);

  const guideOptions: ComboboxOption<IntegrationGuide>[] = useMemo(() => {
    return guides?.map((guide) => ({
      value: guide.key,
      label: guide.title,
      icon: (
        <GuideSelectorIcon icon={guide.icon} {...(guide.iconProps || {})} />
      ),
      badge: guide.recommended ? "Recommended" : undefined,
      description: guide.subtitle,
    }));
  }, [guides]);

  const selectedOption = useMemo(() => {
    if (!value) return null;

    return guideOptions.find((g) => g.value === value.key) || null;
  }, [value, guideOptions]);

  return (
    <Combobox
      options={guideOptions}
      setSelected={(option) => {
        if (option && option.value) {
          const guide = guides.find((guide) => guide.key === option.value);

          if (guide) {
            onChange(guide);
          }
        }
      }}
      selected={selectedOption}
      icon={selectedOption?.icon}
      caret={true}
      placeholder={"Select guide"}
      // searchPlaceholder="Search guides..."
      // onSearchChange={setSearch}
      // shouldFilter={}
      matchTriggerWidth
      open={openPopover}
      onOpenChange={setOpenPopover}
      popoverProps={{
        contentClassName: "min-w-[280px]",
      }}
      labelProps={{
        className: "text-sm font-semibold text-neutral-900",
      }}
      iconProps={
        {
          // className: "h-full",
        }
      }
      buttonProps={{
        disabled,
        className: cn(
          "w-fit p-1 transition-none rounded-lg bg-transparent hover:bg-neutral-200 border-none h-auto",
          className,
        ),
      }}
      hideSearch
    >
      {selectedOption?.label || "Select a guide"}
    </Combobox>
  );
}
