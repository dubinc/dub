import * as SwitchPrimitive from "@radix-ui/react-switch";
import cx from "classnames";
import { Dispatch, SetStateAction } from "react";

const Switch = ({
  setState,
}: {
  setState: Dispatch<SetStateAction<boolean>>;
}) => {
  return (
    <SwitchPrimitive.Root
      defaultChecked={true}
      onCheckedChange={(checked) => setState(checked)}
      className={cx(
        "radix-state-checked:bg-blue-500",
        "radix-state-unchecked:bg-gray-200 dark:radix-state-unchecked:bg-gray-800",
        "relative inline-flex h-4 w-8 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
        "focus:outline-none focus-visible:ring focus-visible:ring-blue-500 focus-visible:ring-opacity-75"
      )}
    >
      <SwitchPrimitive.Thumb
        className={cx(
          "radix-state-checked:translate-x-4",
          "radix-state-unchecked:translate-x-0",
          "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out"
        )}
      />
    </SwitchPrimitive.Root>
  );
};

export default Switch;
