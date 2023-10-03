import { Dispatch, SetStateAction } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

const Slider = ({
  value,
  setValue,
  minValue,
  maxValue,
  stepValue,
}: {
  value: number;
  setValue: Dispatch<SetStateAction<number>>;
  minValue?: number;
  maxValue?: number;
  stepValue?: number;
}) => {
  return (
    <SliderPrimitive.Root
      defaultValue={[value]}
      min={minValue || 0}
      max={maxValue || 100}
      step={stepValue || 1}
      aria-label="value"
      onValueChange={(value) => setValue(value[0])}
      className="relative flex h-5 w-64 touch-none items-center"
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow rounded-full bg-gray-200">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-600" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-5 w-5 cursor-grab rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 focus:outline-none focus-visible:ring focus-visible:ring-blue-500 focus-visible:ring-opacity-75 active:cursor-grabbing" />
    </SliderPrimitive.Root>
  );
};

export default Slider;
