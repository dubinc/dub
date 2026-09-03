import { ReactNode } from "react";

export const emptyTrackingActionClassName =
  "h-8 w-fit shrink-0 gap-2 rounded-lg px-3 py-2";

export function EmptyTrackingCard({
  icon,
  text,
  action,
  variant = "row",
}: {
  icon: ReactNode;
  text: string;
  action: ReactNode;
  variant?: "row" | "stack";
}) {
  if (variant === "stack") {
    return (
      <div className="flex h-[138px] w-full flex-col items-center justify-center gap-4 rounded-xl bg-neutral-50 py-6">
        <div className="flex flex-col items-center gap-2">
          {icon}
          <span className="text-content-subtle text-center text-sm font-medium leading-5 tracking-[-0.02em]">
            {text}
          </span>
        </div>
        {action}
      </div>
    );
  }

  return (
    <div className="flex h-16 w-full items-center justify-between gap-4 rounded-xl bg-neutral-50 py-4 pl-6 pr-4">
      <div className="flex min-w-0 items-center gap-2">
        {icon}
        <span className="text-content-subtle truncate text-center text-sm font-medium leading-5 tracking-[-0.02em]">
          {text}
        </span>
      </div>
      {action}
    </div>
  );
}
