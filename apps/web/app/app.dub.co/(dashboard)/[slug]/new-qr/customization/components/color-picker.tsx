import { FC } from "react";

interface IColorPickerInputProps {
  label: string;
  color: string;
  onColorChange: (color: string) => void;
  pickerId: string;
}

export const ColorPickerInput: FC<IColorPickerInputProps> = ({
  label,
  color,
  onColorChange,
  pickerId,
}) => {
  return (
    <div className="flex flex-col items-start justify-center gap-2">
      <label className="font-medium">{label}</label>
      <div className="border-border-300 relative flex h-11 items-center gap-2 rounded-md border p-3">
        <input
          type="text"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="max-w-[126px] basis-3/4 border-none bg-transparent p-0 text-sm focus:ring-0"
          placeholder="#000000"
        />
        <button
          type="button"
          className="h-5 w-5 basis-1/4 rounded"
          style={{ backgroundColor: color }}
          onClick={() => document.getElementById(pickerId)?.click()}
        />
        <input
          id={pickerId}
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </div>
    </div>
  );
};
