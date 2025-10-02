import { cn } from "@dub/utils";
import { Button, Input } from "@dub/ui";
import { Flex, Text } from "@radix-ui/themes";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import {FC, FormEvent, useCallback, useEffect, useState} from "react";

import { 
  FRAMES, 
  FRAME_TEXT, 
  isDefaultTextColor 
} from "../../constants/customization/frames";
import { 
  BLACK_COLOR, 
  WHITE_COLOR 
} from "../../constants/customization/colors";
import { IFrameData } from "../../types/customization";
import { isValidHex, isBlackHex } from "../../helpers/color-validation";
import { ColorPickerInput } from "./color-picker";
import { StylePicker } from "./style-picker";

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

interface FrameSelectorProps {
  frameData: IFrameData;
  onFrameChange: (frameData: IFrameData) => void;
  disabled?: boolean;
  isMobile?: boolean;
}

export const FrameSelector: FC<FrameSelectorProps> = ({
  frameData,
  onFrameChange,
  disabled = false,
  isMobile = false,
}) => {
  const [frameColor, setFrameColor] = useState<string>(
    frameData.color || BLACK_COLOR,
  );
  const [frameTextColor, setFrameTextColor] = useState<string | null>(
    frameData.textColor || null,
  );
  const [frameText, setFrameText] = useState<string>(
    frameData.text ?? FRAME_TEXT
  );

  const selectedFrame = FRAMES.find((f) => f.id === frameData.id);
  const defaultTextColor = selectedFrame?.defaultTextColor || WHITE_COLOR;
  const currentFrameTextColor = frameTextColor || defaultTextColor;
  const isFrameSelected = frameData.id !== "frame-none";

  useEffect(() => {
    setFrameColor(frameData.color || BLACK_COLOR);
    if (frameData.textColor) {
      setFrameTextColor(frameData.textColor);
    }
    setFrameText(frameData.text ?? FRAME_TEXT);
  }, [frameData]);

  const handleFrameSelect = useCallback(
      (frameId: string) => {
        console.log("=== handleFrameSelect called ===");
        console.log("Selected frameId:", frameId);
        console.log("Current frameData:", frameData);

        // If switching to "no frame", clear all settings
        if (frameId === "frame-none") {
          const newFrameData: IFrameData = {
            id: frameId,
            color: undefined,
            textColor: undefined,
            text: undefined,
          };
          console.log("Clearing frame, sending:", newFrameData);
          onFrameChange(newFrameData);
          return;
        }

        // If re-selecting the same frame, preserve existing settings from frameData
        if (frameId === frameData.id) {
          console.log("Re-selecting same frame, no change");
          return;
        }

        // If switching to a new frame, use current settings but with new frame's default text color
        const newSelectedFrame = FRAMES.find((f) => f.id === frameId);
        const newDefaultTextColor = newSelectedFrame?.defaultTextColor || WHITE_COLOR;

        const newFrameData: IFrameData = {
          id: frameId,
          color: frameColor,
          textColor: newDefaultTextColor,
          text: frameText,
        };

        console.log("Selecting new frame, sending:", newFrameData);
        onFrameChange(newFrameData);
      },
      [frameColor, frameText, onFrameChange, frameData]
  );

  const handleFrameColorChange = useCallback(
      (color: string) => {
        setFrameColor(color);
        const valid = isValidHex(color);

        if (valid && isFrameSelected) {
          onFrameChange({
            ...frameData,
            color,
          });
        }
      },
      [setFrameColor, isFrameSelected, onFrameChange, frameData]
  );

  const handleFrameTextColorChange = useCallback(
      (color: string) => {
        setFrameTextColor(color);
        const valid = isValidHex(color);

        if (valid && isFrameSelected) {
          onFrameChange({
            ...frameData,
            textColor: color,
          });
        }
      },
      [setFrameTextColor, isFrameSelected, onFrameChange, frameData]
  );

  const handleFrameTextChange = useCallback(
      (text: string) => {
        const truncatedText = text.slice(0, MAX_FRAME_TEXT_LENGTH);
        setFrameText(truncatedText);

        if (isFrameSelected) {
          onFrameChange({
            ...frameData,
            text: truncatedText,
          });
        }
      },
      [setFrameText, isFrameSelected, onFrameChange, frameData]
  );


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
        value={frameData.id}
        onSelect={handleFrameSelect}
        optionsWrapperClassName={`gap-2 ${
          disabled ? "pointer-events-none cursor-not-allowed" : ""
        }`}
        styleButtonClassName="[&_img]:h-[60px] [&_img]:w-[60px] p-2"
        disabled={disabled}
      />
      
      <AnimatePresence>
        {isFrameSelected && (
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
                )}
                placeholder="Frame Text"
                value={frameText}
                onChange={(e) => handleFrameTextChange(e.target.value)}
                onBeforeInput={(e: FormEvent<HTMLInputElement>) => {
                  if (frameText.length >= MAX_FRAME_TEXT_LENGTH) {
                    e.preventDefault();
                  }
                }}
                maxLength={MAX_FRAME_TEXT_LENGTH}
                disabled={disabled}
              />
            </Flex>
            
            <Flex direction="row" gap="2" className="items-end text-sm">
              <ColorPickerInput
                label="Frame colour"
                value={frameColor}
                onChange={handleFrameColorChange}
                disabled={disabled}
              />
              <AnimatePresence>
                {!isBlackHex(frameColor) && (
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
                      disabled={disabled}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </Flex>
            
            <Flex direction="row" gap="2" className="items-end text-sm">
              <ColorPickerInput
                label="Text Colour"
                value={currentFrameTextColor}
                onChange={handleFrameTextColorChange}
                disabled={disabled}
              />
              <AnimatePresence>
                {frameTextColor !== null && !isDefaultTextColor(frameTextColor) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      variant="secondary"
                      className="border-border-500 h-11 max-w-11 p-3"
                      onClick={() => handleFrameTextColorChange(defaultTextColor)}
                      icon={<RotateCcw className="text-neutral h-5 w-5" />}
                      disabled={disabled}
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