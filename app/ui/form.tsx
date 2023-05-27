import { useState, useMemo, InputHTMLAttributes } from "react";
import Button from "#/ui/button";

export default function Form({
  title,
  description,
  inputData,
  helpText,
  handleSubmit,
}: {
  title: string;
  description: string;
  inputData: InputHTMLAttributes<HTMLInputElement>;
  helpText?: string;
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
      <div className="relative flex flex-col space-y-3 p-5 sm:p-10">
        <h2 className="text-xl font-medium">{title}</h2>
        <div className="flex items-center space-x-1">
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <div />
        {typeof inputData.defaultValue === "string" ? (
          <input
            {...inputData}
            type="text"
            required
            onChange={(e) => setValue(e.target.value)}
            className="w-full max-w-md rounded-md border border-gray-300 text-sm text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500"
          />
        ) : (
          <div className="h-[2.35rem] w-full max-w-md animate-pulse rounded-md bg-gray-200" />
        )}
      </div>

      <div className="flex items-center justify-between rounded-b-lg border-t border-gray-200 bg-gray-50 p-3 sm:px-10">
        <p className="text-sm text-gray-500">{helpText}</p>
        <div className="w-32">
          <Button
            text="Save Changes"
            loading={saving}
            disabled={saveDisabled}
          />
        </div>
      </div>
    </form>
  );
}
