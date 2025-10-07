import { cn } from "@dub/utils";
import { PropsWithChildren } from "react";
import {
  PageContentHeader,
  PageContentHeaderProps,
} from "./page-content-header";

export * from "./page-content-old";

export function PageContent({
  className,
  contentWrapperClassName,
  children,
  ...headerProps
}: PropsWithChildren<
  {
    className?: string;
    contentWrapperClassName?: string;
  } & PageContentHeaderProps
>) {
  return (
    <div
      className={cn(
        "rounded-t-[inherit] bg-neutral-100 md:bg-white",
        className,
      )}
    >
      <PageContentHeader {...headerProps} />
      <div
        className={cn(
          "rounded-t-[inherit] bg-white pt-3 lg:pt-6",
          contentWrapperClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
