import { cn } from "@dub/utils";
import { ReactNode } from "react";

/** Shared content column — hero inner content + body sections align to this width. */
export const marketplaceProgramDetailsColumnClassName =
  "mx-auto w-full max-w-screen-md";

/**
 * Program detail grid: full-width hero card, centered content column (Figma).
 */
export function MarketplaceProgramDetailsLayout({
  header,
  hero,
  children,
}: {
  header?: ReactNode;
  hero: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="w-full">
      {header ? (
        <div className={cn(marketplaceProgramDetailsColumnClassName, "mb-6")}>
          {header}
        </div>
      ) : null}
      {hero}
      <div className={marketplaceProgramDetailsColumnClassName}>{children}</div>
    </div>
  );
}
