import { cn } from "@dub/utils";
import { ChangeEvent, FC, useEffect, useState } from "react";
import { isValidHex } from "../helpers/is-valid-hex.ts";
import { isWhiteHex } from "../helpers/is-white-hex.ts";

interface IColorPickerInputProps {
  label: string;
  color: string;
  onColorChange: (color: string) => void;
  pickerId: string;
  isValid: boolean;
  setIsValid: (isValid: boolean) => void;
  disabled?: boolean;
}

export const ColorPickerInput: FC<IColorPickerInputProps> = ({
  label,
  color,
  onColorChange,
  pickerId,
  isValid,
  setIsValid,
  disabled = false,
}) => {
  const [showBorder, setShowBorder] = useState(false);

  useEffect(() => {
    setShowBorder(isWhiteHex(color));
    setIsValid(isValidHex(color));
  }, [color]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value.toUpperCase();
    setIsValid(isValidHex(newColor));
    onColorChange(newColor);
  };

  return (
    <div className="flex flex-col items-start justify-center gap-2">
      <label className="font-medium">{label}</label>
      <div
        className={cn(
          "border-border-300 relative flex h-11 min-w-[130px] max-w-[130px] items-center gap-2 rounded-md border p-3 lg:min-w-[130px]",
          {
            "border-red-600": !isValid,
            "bg-border-200 cursor-not-allowed text-neutral-200": disabled,
          },
        )}
      >
        <input
          type="text"
          value={color}
          onChange={handleInputChange}
          className={cn(
            "w-full max-w-[126px] basis-3/4 border-none p-0 text-sm focus:ring-0",
            {
              "text-red-600": !isValid,
              "bg-border-200 text-neutral-200": disabled,
            },
          )}
          placeholder="#000000"
          disabled={disabled}
        />
        <button
          type="button"
          className={cn("h-5 max-h-5 w-5 max-w-5 basis-1/4 rounded", {
            "border-border-300 border": showBorder || !isValid,
            "cursor-not-allowed": disabled,
          })}
          style={{
            backgroundColor: color,
          }}
          onClick={() => document.getElementById(pickerId)?.click()}
        />
        <input
          id={pickerId}
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value.toUpperCase())}
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={disabled}
        />
      </div>
    </div>
  );
};
