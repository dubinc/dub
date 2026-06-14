import { ReactNode } from "react";

export const marketplaceProgramDetailsColumnClassName =
  "mx-auto w-full max-w-screen-md";

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
      {header ? <div className="mb-6">{header}</div> : null}
      {hero}
      <div className={marketplaceProgramDetailsColumnClassName}>{children}</div>
    </div>
  );
}
