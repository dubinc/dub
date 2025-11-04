import {
  ArrowUpRight,
  BadgeCheck2Fill,
  Button,
  Icon,
  Tooltip,
  Trash,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { PropsWithChildren } from "react";

export function OnlinePresenceCard({
  icon: Icon,
  prefix,
  value,
  verified,
  info,
  href,
  onRemove,
}: {
  icon: Icon;
  prefix?: string;
  value: string;
  verified?: boolean;
  info?: string[];
  href?: string;
  onRemove?: () => void;
}) {
  return (
    <Container
      href={href}
      className={cn(
        "border-subtle group flex items-center justify-between gap-3 rounded-lg border bg-white p-3",
        href && "transition-colors hover:bg-neutral-50 active:bg-neutral-100",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="border-subtle flex size-8 shrink-0 items-center justify-center rounded-full border">
          <Icon className="size-4" />
        </div>
        <div className="flex min-w-0 flex-col text-xs">
          <div className="flex items-center gap-1">
            <span className="text-content-emphasis block min-w-0 truncate font-semibold">
              {prefix}
              {value}
            </span>
            {verified && (
              <Tooltip content="Verified" disableHoverableContent>
                <div className="shrink-0">
                  <BadgeCheck2Fill className="size-3.5 text-green-600" />
                </div>
              </Tooltip>
            )}
          </div>
          {info && info.length > 0 && (
            <div className="text-content-subtle min-w-0 truncate font-medium">
              {info.join(" • ")}
            </div>
          )}
        </div>
      </div>
      {href ? (
        <ArrowUpRight className="text-content-subtle mr-1 size-4 -translate-x-0.5 translate-y-0.5 opacity-0 transition-[opacity,transform] group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
      ) : (
        onRemove && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<Trash className="size-4" />}
              className="text-content-subtle hover:text-content-default size-8 p-0"
              onClick={onRemove}
            />
          </div>
        )
      )}
    </Container>
  );
}

const Container = ({
  href,
  children,
  ...rest
}: PropsWithChildren<{ href?: string; className?: string }>) => {
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  ) : (
    <div {...rest}>{children}</div>
  );
};
