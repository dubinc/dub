import { ColorPickerInput } from "@/ui/qr-builder/components/color-picker.tsx";
import {
  BLACK_COLOR,
  WHITE_COLOR,
} from "@/ui/qr-builder/constants/customization/colors.ts";
import {
  FRAME_TEXT,
  FRAMES,
} from "@/ui/qr-builder/constants/customization/frames.ts";
import { isValidHex } from "@/ui/qr-builder/helpers/is-valid-hex.ts";
import { FrameOptions } from "@/ui/qr-builder/types/types.ts";
import { Button, Input } from "@dub/ui";
import { cn } from "@dub/utils/src";
import { Flex, Text } from "@radix-ui/themes";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { FC, FormEvent, useEffect, useState } from "react";
import { StylePicker } from "./style-picker.tsx";

const MAX_FRAME_TEXT_LENGTH = 10;

const animationVariants = {
  open: {
    height: "auto",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 40,
    },
  },
  closed: {
    height: 0,
    transition: {
      type: "tween",
      duration: 0.3,
      ease: "easeInOut",
    },
  },
};

interface IFrameSelectorProps {
  selectedSuggestedFrame: string;
  isQrDisabled: boolean;
  onFrameSelect: (type: string) => void;
  onFrameColorChange: (color: string) => void;
  onFrameTextColorChange: (color: string) => void;
  onFrameTextChange: (text: string) => void;
  isMobile: boolean;
  frameOptions: FrameOptions;
}

export const FrameSelector: FC<IFrameSelectorProps> = ({
  selectedSuggestedFrame,
  isQrDisabled,
  onFrameSelect,
  onFrameColorChange,
  onFrameTextColorChange,
  onFrameTextChange,
  isMobile,
  frameOptions,
}) => {
  const [frameColor, setFrameColor] = useState<string>(
    frameOptions?.color || BLACK_COLOR,
  );
  const [frameColorValid, setFrameColorValid] = useState<boolean>(true);
  const [frameTextColor, setFrameTextColor] = useState<string | null>(
    frameOptions?.textColor || null,
  );
  const [frameTextColorValid, setFrameTextColorValid] = useState<boolean>(true);
  const [frameText, setFrameText] = useState<string>(
    frameOptions?.text ?? FRAME_TEXT
  );

  const selectedFrame = FRAMES.find((f) => f.type === selectedSuggestedFrame);
  const defaultTextColor = selectedFrame?.defaultTextColor || WHITE_COLOR;

  const currentFrameTextColor = frameTextColor || defaultTextColor;

  useEffect(() => {
    if (frameOptions) {
      setFrameColor(frameOptions.color || BLACK_COLOR);
      if (frameOptions.textColor) {
        setFrameTextColor(frameOptions.textColor);
      }
      setFrameText(frameOptions?.text ?? FRAME_TEXT);
    }
  }, [frameOptions]);

  const handleFrameColorChange = (color: string) => {
    setFrameColor(color);
    const valid = isValidHex(color);
    setFrameColorValid(valid);
    onFrameColorChange(color);
  };

  const handleFrameTextColorChange = (color: string) => {
    setFrameTextColor(color);
    const valid = isValidHex(color);
    setFrameTextColorValid(valid);
    onFrameTextColorChange(color);
  };

  const handleFrameTextChange = (text: string) => {
    const truncatedText = text.slice(0, MAX_FRAME_TEXT_LENGTH);
    setFrameText(truncatedText);
    onFrameTextChange(truncatedText);
  };

  return (
    <motion.div
      layout
      className={cn("flex max-w-[680px] flex-col gap-4", {
        "border-border-500 rounded-lg border p-3": !isMobile,
      })}
    >
      <StylePicker
        label="Frame around QR code"
        styleOptions={FRAMES}
        selectedStyle={selectedSuggestedFrame}
        onSelect={(type) => {
          if (!isQrDisabled) {
            onFrameSelect(type);
          }
        }}
        optionsWrapperClassName={`gap-2 ${
          isQrDisabled ? "pointer-events-none cursor-not-allowed" : ""
        }`}
        styleButtonClassName="[&_img]:h-[60px] [&_img]:w-[60px] p-2"
      />
      <AnimatePresence>
        {selectedSuggestedFrame !== "none" && (
          <motion.div
            className="flex w-full flex-col gap-4 overflow-hidden md:flex-row"
            variants={animationVariants}
            initial="closed"
            animate="open"
            exit="closed"
          >
            <Flex direction="column" gap="2" className="grow">
              <Text as="p" className="text-sm font-medium">
                Text
              </Text>
              <Input
                type="text"
                className={cn(
                  "border-border-500 focus:border-secondary h-11 w-full max-w-2xl rounded-md border p-3 text-base",
                  {
                    "border-red-500": false,
                  },
                )}
                placeholder={"Frame Text"}
                value={frameText}
                onChange={(e) => handleFrameTextChange(e.target.value)}
                onBeforeInput={(e: FormEvent<HTMLInputElement>) => {
                  if (frameText.length >= MAX_FRAME_TEXT_LENGTH) {
                    e.preventDefault();
                  }
                }}
                maxLength={MAX_FRAME_TEXT_LENGTH}
              />
            </Flex>
            <Flex direction="row" gap="2" className="items-end text-sm">
              <ColorPickerInput
                label="Frame colour"
                color={frameColor}
                onColorChange={handleFrameColorChange}
                isValid={frameColorValid}
                setIsValid={setFrameColorValid}
              />
              <AnimatePresence>
                {frameColor !== BLACK_COLOR && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      variant="secondary"
                      className="border-border-500 h-11 max-w-11 p-3"
                      onClick={() => handleFrameColorChange(BLACK_COLOR)}
                      icon={<RotateCcw className="text-neutral h-5 w-5" />}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </Flex>
            <Flex direction="row" gap="2" className="items-end text-sm">
              <ColorPickerInput
                label="Text Colour"
                color={currentFrameTextColor}
                onColorChange={handleFrameTextColorChange}
                isValid={frameTextColorValid}
                setIsValid={setFrameTextColorValid}
              />
              <AnimatePresence>
                {frameTextColor !== null && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      variant="secondary"
                      className="border-border-500 h-11 max-w-11 p-3"
                      onClick={() =>
                        handleFrameTextColorChange(defaultTextColor)
                      }
                      icon={<RotateCcw className="text-neutral h-5 w-5" />}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </Flex>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
