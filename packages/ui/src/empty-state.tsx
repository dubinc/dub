import { PropsWithChildren, ReactNode } from "react";

export type EmptyStateProps = PropsWithChildren<{
  icon: React.ElementType;
  title: string;
  description?: ReactNode;
  learnMore?: string;
}>;

export function EmptyState({
  icon: Icon,
  title,
  description,
  learnMore,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-y-4">
      <div className="flex size-16 items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50">
        <Icon className="size-6 text-neutral-800" />
      </div>
      <p className="text-center text-base font-medium text-neutral-950">
        {title}
      </p>
      {description && (
        <p className="max-w-sm text-balance text-center text-sm text-neutral-500">
          {description}{" "}
          {learnMore && (
            <a
              href={learnMore}
              target="_blank"
              className="underline underline-offset-2 hover:text-neutral-800"
            >
              Learn more ↗
            </a>
          )}
        </p>
      )}
      {children}
    </div>
  );
}
