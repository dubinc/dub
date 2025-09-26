import { cn } from "@dub/utils";
import { Flex, Text } from "@radix-ui/themes";
import { FC, useEffect, useState } from "react";
import { isValidHex, isWhiteHex } from "../../helpers/color-validation";

interface ColorPickerInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const ColorPickerInput: FC<ColorPickerInputProps> = ({
  label,
  value,
  onChange,
  disabled = false,
}) => {
  const [showBorder, setShowBorder] = useState(false);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    setShowBorder(isWhiteHex(value));
    setIsValid(isValidHex(value));
  }, [value]);

  return (
    <Flex
      direction="column"
      align="start"
      justify="center"
      gap="2"
      className="w-full"
    >
      <label className="font-medium">{label}</label>
      <div
        className={cn(
          "border-border-500 relative flex h-11 w-full cursor-pointer items-center justify-between rounded-md border p-3 md:min-w-[130px]",
          {
            "border-red-600": !isValid,
            "bg-border-200 cursor-not-allowed": disabled,
          },
        )}
      >
        <Text
          as="span"
          className={cn("text-sm", {
            "text-red-600": !isValid,
            "text-neutral-400": disabled,
          })}
        >
          {value}
        </Text>
        <div className="pointer-events-none h-5 w-5 flex-shrink-0">
          <div
            className={cn("h-full w-full rounded", {
              "border-border-500 border": showBorder,
            })}
            style={{ backgroundColor: value }}
          />
        </div>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          disabled={disabled}
        />
      </div>
    </Flex>
  );
};