"use client";

import { StackItem } from "@/ui/guides/integrations";
import { Layers3 } from "@dub/ui/icons";
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

const stackItemTitleClassName =
  "text-xs font-semibold leading-4 tracking-[-0.02em] text-neutral-800";

function StackItemTitle({ title }: { title: string }) {
  const stripeSuffix = title.startsWith("Stripe ")
    ? title.slice("Stripe ".length)
    : null;

  if (!stripeSuffix) {
    return (
      <span className={cn("min-w-0 flex-1 truncate", stackItemTitleClassName)}>
        {title}
      </span>
    );
  }

  return (
    <span className="flex min-w-0 flex-1 items-baseline gap-1 truncate">
      <span className={stackItemTitleClassName}>Stripe</span>
      <span className="text-content-subtle text-xs font-medium leading-4 tracking-[-0.02em]">
        {stripeSuffix}
      </span>
    </span>
  );
}

export function StackSelectionStatus({ count }: { count: number }) {
  return (
    <p className="text-content-subtle flex items-center gap-1.5 text-xs font-medium">
      <Layers3 className="size-3.5 shrink-0" />
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
    <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
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
              "relative flex h-[42px] items-center gap-2.5 rounded-lg border p-2 text-left transition-[border-color,background-color,transform] duration-150 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/50",
              "active:scale-[0.98]",
              selected
                ? "border-neutral-600 bg-neutral-50"
                : "border-neutral-200 bg-white",
              !disabled &&
                "[@media(hover:hover)_and_(pointer:fine)]:hover:border-neutral-600",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <StackItemIcon
              icon={item.icon}
              fullSize={item.iconProps?.fullSize}
            />
            <StackItemTitle title={item.title} />
          </button>
        );
      })}
    </div>
  );
}
