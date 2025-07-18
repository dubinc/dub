import { PropsWithChildren } from "react";

export function SettingsRow({
  heading,
  description,
  required,
  children,
}: PropsWithChildren<{
  heading: string;
  description?: string;
  required?: boolean;
}>) {
  return (
    <div className="grid grid-cols-1 gap-4 py-8 sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <h3 className="text-[15px] font-medium leading-none text-neutral-900">
          {heading} {required && <span className="text-red-700">*</span>}
        </h3>
        {description && (
          <p className="text-sm text-neutral-600">{description}</p>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}
