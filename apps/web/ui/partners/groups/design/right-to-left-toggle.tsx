import { Checkbox, InfoTooltip } from "@dub/ui";
import { Control, Controller } from "react-hook-form";

export function RightToLeftToggle({
  control,
  name,
}: {
  control: Control<any>;
  name: string;
}) {
  return (
    <label className="flex items-center gap-2">
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Checkbox
            checked={field.value === "rtl"}
            onCheckedChange={(checked) => {
              field.onChange(checked ? "rtl" : "ltr");
            }}
          />
        )}
      />
      <span className="text-sm font-medium text-neutral-700">
        Right-to-left text{" "}
      </span>
      <InfoTooltip content="Enable for languages written from the right to the left." />
    </label>
  );
}
