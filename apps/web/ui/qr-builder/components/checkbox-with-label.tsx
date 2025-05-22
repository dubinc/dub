import { Checkbox, Flex, Text } from "@radix-ui/themes";
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
  <Text as="label" size="2">
    <Flex gap="2">
      <Checkbox
        value={label}
        id={label.toLowerCase().replace(" ", "-")}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
      {label}
    </Flex>
  </Text>
);
