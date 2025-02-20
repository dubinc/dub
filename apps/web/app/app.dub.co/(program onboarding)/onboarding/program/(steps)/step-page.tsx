import { cn } from "@dub/utils";
import { PropsWithChildren, ReactNode } from "react";

export function StepPage({
  children,
  title,
  className,
}: PropsWithChildren<{
  title: ReactNode;
  className?: string;
}>) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-xl flex-col bg-yellow-50",
        "animate-slide-up-fade [--offset:10px] [animation-duration:1s] [animation-fill-mode:both]",
        className,
      )}
    >
      <h1 className="mt-4 text-2xl font-medium leading-tight text-neutral-900">
        {title}
      </h1>
      <div className="mt-8 w-full">{children}</div>
    </div>
  );
}
