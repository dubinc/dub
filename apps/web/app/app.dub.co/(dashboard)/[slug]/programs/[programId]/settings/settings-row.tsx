import { PropsWithChildren } from "react";

export function SettingsRow({
  heading,
  description,
  children,
}: PropsWithChildren<{ heading: string; description?: string }>) {
  return (
    <div className="grid grid-cols-1 gap-4 py-8 sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <h3 className="font-medium leading-none text-neutral-900">{heading}</h3>
        {description && (
          <p className="text-sm text-neutral-600">{description}</p>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}
