import { Icon } from "@dub/ui";
import { cn } from "@dub/utils";
import { PropsWithChildren, ReactNode } from "react";

export function StepPage({
  children,
  icon: Icon,
  title,
  description,
  className,
}: PropsWithChildren<{
  icon?: Icon;
  title: ReactNode;
  description: ReactNode;
  className?: string;
}>) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-sm flex-col items-center",
        "animate-slide-up-fade [--offset:10px] [animation-duration:1s] [animation-fill-mode:both]",
        className,
      )}
    >
      {Icon && <StepIcon icon={Icon} />}
      <h1 className="mt-4 text-2xl font-medium leading-tight">{title}</h1>
      <p className="mt-1.5 text-base leading-tight text-gray-500">
        {description}
      </p>
      {children}
    </div>
  );
}

function StepIcon({ icon: Icon }: { icon: Icon }) {
  return (
    <div className="rounded-full border border-gray-200 bg-white p-2.5">
      <Icon className="size-[18px]" />
    </div>
  );
}
