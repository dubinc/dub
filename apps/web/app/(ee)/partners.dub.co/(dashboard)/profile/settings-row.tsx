import { PropsWithChildren } from "react";

export function SettingsRow({
  heading,
  description,
  children,
}: PropsWithChildren<{
  heading: string;
  description: string;
}>) {
  return (
    <div className="@2xl/page:grid-cols-2 grid grid-cols-1 gap-10 px-6 py-8 lg:gap-16">
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
