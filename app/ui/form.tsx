import { useState, useMemo, InputHTMLAttributes, ReactNode } from "react";
import Button from "#/ui/button";
import { cn } from "#/lib/utils";

export default function Form({
  title,
  description,
  inputData,
  helpText,
  disabledTooltip,
  handleSubmit,
}: {
  title: string;
  description: string;
  inputData: InputHTMLAttributes<HTMLInputElement>;
  helpText?: string;
  disabledTooltip?: string | ReactNode;
  handleSubmit: (data) => Promise<any>;
}) {
  const [value, setValue] = useState(inputData.defaultValue);
  const [saving, setSaving] = useState(false);
  const saveDisabled = useMemo(() => {
    return saving || !value || value === inputData.defaultValue;
  }, [saving, value, inputData.defaultValue]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        await handleSubmit({
          [inputData.name as string]: value,
        });
        setSaving(false);
      }}
      className="rounded-lg border border-gray-200 bg-white"
    >
      <div className="relative flex flex-col space-y-6 p-5 sm:p-10">
        <div className="flex flex-col space-y-3">
          <h2 className="text-xl font-medium">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        {typeof inputData.defaultValue === "string" ? (
          <input
            {...inputData}
            type="text"
            required
            disabled={disabledTooltip ? true : false}
            onChange={(e) => setValue(e.target.value)}
            className={cn(
              "w-full max-w-md rounded-md border border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm",
              {
                "cursor-not-allowed bg-gray-100 text-gray-400": disabledTooltip,
              },
            )}
          />
        ) : (
          <div className="h-[2.35rem] w-full max-w-md animate-pulse rounded-md bg-gray-200" />
        )}
      </div>

      <div className="flex items-center justify-between rounded-b-lg border-t border-gray-200 bg-gray-50 p-3 sm:px-10">
        <p className="text-sm text-gray-500">{helpText}</p>
        <div>
          <Button
            text="Save Changes"
            loading={saving}
            disabled={saveDisabled}
            disabledTooltip={disabledTooltip}
          />
        </div>
      </div>
    </form>
  );
}
