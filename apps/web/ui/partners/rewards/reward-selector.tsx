import { GroupBadge } from "@/ui/partners/rewards/group-badge";
import { Combobox, ComboboxOption } from "@dub/ui";
import { cn } from "@dub/utils";

export type RewardSelectorOption = ComboboxOption<{
  isGroup?: boolean;
  partnersCount?: number | null;
}>;

export function RewardSelector({
  label,
  options,
  selectedId,
  onChange,
}: {
  label: string;
  options: RewardSelectorOption[];
  selectedId: string | null | undefined;
  onChange: (id: string | null) => void;
}) {
  const selected =
    options.find((option) => option.value === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-content-emphasis block text-sm font-medium">
        {label}
      </label>
      <Combobox
        selected={selected}
        setSelected={(option) => {
          if (!option) {
            return;
          }

          onChange(option.meta?.isGroup ? null : option.value);
        }}
        options={options}
        caret
        hideSearch
        shouldFilter={false}
        matchTriggerWidth
        placeholder="None"
        popoverProps={{
          contentClassName: "w-[var(--radix-popover-trigger-width)]",
        }}
        buttonProps={{
          className: cn(
            "w-full h-10 justify-start px-3",
            "data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500",
            "focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-none",
          ),
        }}
        labelProps={{
          className:
            "flex min-w-0 items-center justify-between gap-2 overflow-hidden",
        }}
        optionRight={(option) =>
          option.meta?.isGroup ? <GroupBadge /> : undefined
        }
      >
        {selected ? (
          <>
            <span className="min-w-0 truncate">{selected.label}</span>
            {selected.meta?.isGroup && <GroupBadge />}
          </>
        ) : null}
      </Combobox>
    </div>
  );
}
