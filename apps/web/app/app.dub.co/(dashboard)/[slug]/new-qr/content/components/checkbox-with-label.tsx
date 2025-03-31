import { Checkbox } from "@dub/ui";
import { FC } from "react";

interface ICheckboxWithLabelProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const CheckboxWithLabel: FC<ICheckboxWithLabelProps> = ({
  label,
  checked,
  onCheckedChange,
}) => (
  <div
    className="border-border-300 flex h-11 w-full basis-1/2 cursor-pointer items-center gap-3 rounded-md border bg-[#F5F5F5] p-3"
    onClick={() => onCheckedChange(!checked)}
  >
    <Checkbox
      value={label}
      id={label.toLowerCase().replace(" ", "-")}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="data-[state=checked]:bg-secondary border-border-300 outline-0 data-[state=checked]:border-none"
    />
    <label className="text-neutral text-xs font-normal md:text-sm">
      {label}
    </label>
  </div>
);
