"use client";

import { StackItem } from "@/ui/guides/integrations";
import { StackY3 } from "@dub/ui/icons";
import { cn } from "@dub/utils";

function StackItemIcon({
  icon: Icon,
  fullSize,
}: {
  icon: StackItem["icon"];
  fullSize?: boolean;
}) {
  if (fullSize) {
    return (
      <Icon
        className="size-5 shrink-0 overflow-hidden rounded"
        width="auto"
        height="100%"
      />
    );
  }

  return <Icon className="size-5 shrink-0" />;
}

export function StackSelectionStatus({ count }: { count: number }) {
  return (
    <p className="text-content-subtle flex items-center gap-1.5 text-xs font-medium">
      <StackY3 className="size-3.5 shrink-0" />
      {count} item{count === 1 ? "" : "s"} selected
    </p>
  );
}

export function StackPicker({
  items,
  value,
  onChange,
  disabled,
}: {
  items: StackItem[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}) {
  const toggleItem = (id: string) => {
    if (disabled) {
      return;
    }

    onChange(
      value.includes(id) ? value.filter((item) => item !== id) : [...value, id],
    );
  };

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((item) => {
        const selected = value.includes(item.id);

        return (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => toggleItem(item.id)}
            className={cn(
              "relative flex items-center gap-2 rounded-lg border-2 bg-white px-3 py-2 text-left transition-[border-color,transform] duration-150 ease-out",
              "focus-visible:ring-2 focus-visible:ring-black/50 focus-visible:outline-none",
              "active:scale-[0.98]",
              selected ? "border-neutral-900" : "border-neutral-200",
              !disabled &&
                "[@media(hover:hover)_and_(pointer:fine)]:hover:border-neutral-900",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <StackItemIcon icon={item.icon} fullSize={item.iconProps?.fullSize} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-800">
              {item.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}
