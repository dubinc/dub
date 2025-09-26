import { PropsWithChildren } from "react";

export type FormControlProps = PropsWithChildren<{
  label: string;
  required?: boolean;
}>

export const FormControl = ({ label, required, children }: FormControlProps) => {
  return (
    <label>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-content-emphasis">{label}</span>
        {required && (
          <span className="rounded-md text-xs font-semibold text-orange-600 bg-orange-100 px-1 min-h-4">Required</span>
        )}
      </div>

      <div className="mt-2">
        {children}
      </div>
    </label>
  );
}
