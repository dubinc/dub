import { Icon } from "@dub/ui";
import { cn } from "@dub/utils";
import * as HoverCard from "@radix-ui/react-hover-card";

export const ProgramRewardIcon = ({
  icon: Icon,
  description,
  onClick,
  className,
  iconClassName,
}: {
  icon: Icon;
  description: string;
  onClick?: () => void;
  className?: string;
  iconClassName?: string;
}) => {
  const iconSurface = (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md p-1",
        onClick && "hover:bg-bg-subtle active:bg-bg-emphasis transition-colors",
      )}
    >
      <Icon className={cn("size-4", iconClassName)} />
    </span>
  );

  return (
    <HoverCard.Root openDelay={100}>
      <HoverCard.Portal>
        <HoverCard.Content
          side="bottom"
          sideOffset={8}
          className="animate-slide-up-fade z-[99] flex items-center gap-2 overflow-hidden rounded-xl border border-neutral-200 bg-white p-2 text-xs text-neutral-700 shadow-sm"
        >
          <Icon className="text-content-default size-4" />
          <span>{description}</span>
        </HoverCard.Content>
      </HoverCard.Portal>
      <HoverCard.Trigger asChild>
        <button
          type="button"
          onClick={(e) => {
            if (!onClick) return;
            e.preventDefault();
            e.stopPropagation();
            onClick();
          }}
          className={cn(
            "inline-flex shrink-0 border-0 bg-transparent p-0",
            className,
          )}
        >
          {iconSurface}
        </button>
      </HoverCard.Trigger>
    </HoverCard.Root>
  );
};
