import { Icon } from "@dub/ui";
import { cn } from "@dub/utils";
import * as HoverCard from "@radix-ui/react-hover-card";

export const ProgramRewardIcon = ({
  icon: Icon,
  description,
  onClick,
  className,
}: {
  icon: Icon;
  description: string;
  onClick?: () => void;
  className?: string;
}) => {
  const As = onClick ? "button" : "div";

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
      <HoverCard.Trigger>
        <As
          {...(onClick && {
            type: "button",
            onClick: (e) => {
              e.preventDefault();
              e.stopPropagation();
              onClick?.();
            },
          })}
          className={cn(
            "text-content-default flex size-6 items-center justify-center rounded-md",
            onClick && "hover:bg-bg-subtle active:bg-bg-emphasis",
            className,
          )}
        >
          <Icon className="size-4" />
        </As>
      </HoverCard.Trigger>
    </HoverCard.Root>
  );
};
