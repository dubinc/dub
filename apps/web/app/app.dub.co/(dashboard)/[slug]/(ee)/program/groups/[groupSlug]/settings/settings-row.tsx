import { PropsWithChildren, ReactNode } from "react";

export function SettingsRow({
  heading,
  description,
  children,
}: PropsWithChildren<{
  heading: string;
  description: ReactNode;
}>) {
  return (
    <div className="grid grid-cols-1 gap-10 px-6 py-8 sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <h3 className="text-content-emphasis text-base font-semibold leading-none">
          {heading}
        </h3>
        <p className="text-content-subtle text-sm">{description}</p>
      </div>

      <div>{children}</div>
    </div>
  );
}
