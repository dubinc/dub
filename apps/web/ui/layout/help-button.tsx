"use client";

import { Button, Popover } from "@dub/ui";
import { cn } from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpenText,
  ChevronLeft,
  LucideIcon,
  MessageSquareText,
  Upload,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { ElementType, useEffect, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";

export default function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover
      content={
        <div className="w-full overflow-hidden px-6 py-5 text-sm">
          <HelpSection onClose={() => setIsOpen(false)} />
        </div>
      }
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      align="end"
    >
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="font-lg relative h-12 w-12 overflow-hidden rounded-full border border-gray-200 bg-white shadow-md active:bg-gray-50"
      >
        <AnimatePresence>
          <motion.div
            key={isOpen ? "open" : "closed"}
            className="absolute inset-0 flex items-center justify-center text-base font-medium text-gray-700 hover:text-gray-700"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
          >
            {isOpen ? <XIcon className="h-4 w-4" strokeWidth={2} /> : "?"}
          </motion.div>
        </AnimatePresence>
      </button>
    </Popover>
  );
}

function HelpSection({ onClose }: { onClose: () => void }) {
  const [screen, setScreen] = useState<"main" | "contact">("main");
  const [message, setMessage] = useState("");

  const ref = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (ref.current) {
      setContentHeight(ref.current.offsetHeight);
    }
  });

  return (
    <motion.div
      className="max-w-full sm:w-[20rem]"
      animate={{ height: contentHeight }}
      transition={{ ease: "easeInOut" }}
    >
      <div ref={ref}>
        {screen === "main" && (
          <div className="w-full">
            <h3 className="text-base font-semibold">Need help?</h3>
            <p className="mt-2 text-gray-600">
              Check out our help center or get in touch for more assistance.
            </p>
            <div className="mt-3 flex flex-col space-y-1">
              <HelpLink
                icon={BookOpenText}
                label="Help center"
                href="https://dub.co/help"
              />
              <HelpLink
                as="button"
                type="button"
                icon={MessageSquareText}
                label="Get in touch"
                onClick={() => setScreen("contact")}
              />
            </div>
          </div>
        )}
        {screen === "contact" && (
          <div className="w-full">
            <button
              type="button"
              className="-ml-2 flex items-center space-x-2 rounded-md px-2 py-1 hover:bg-gray-100"
              onClick={() => setScreen("main")}
            >
              <ChevronLeft className="h-4 w-4" />
              <h3 className="flex items-center gap-0.5 text-base font-semibold">
                Contact support
              </h3>
            </button>
            <label className="mt-5 block w-full">
              <span className="block text-sm font-medium text-gray-700">
                Your message
              </span>
              <TextareaAutosize
                name="message"
                required
                placeholder="E.g. My custom domain is not working."
                value={message}
                autoComplete="off"
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className={`${
                  false
                    ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:ring-gray-500"
                } mt-1 block w-full resize-none rounded-md focus:outline-none sm:text-sm`}
              />
            </label>
            {/* TODO */}
            <label className="mt-3 flex cursor-pointer items-center space-x-1 py-1">
              <p className="text-gray-500 hover:text-gray-700 hover:underline">
                Upload attachment
              </p>
              <Upload className="h-3 w-3" />
            </label>
            <Button
              className="mt-3 h-9"
              disabled={!message}
              text="Send message"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function HelpLink<T extends ElementType = typeof Link>({
  as,
  icon: Icon,
  label,
  href,
  onClick,
}: {
  as?: T;
  icon: LucideIcon;
  label: string;
} & React.ComponentPropsWithoutRef<T>) {
  const Component = as || Link;

  return (
    <Component
      href={href}
      target="_blank"
      className={cn(
        "-mx-2 flex items-center gap-1.5 rounded-md px-2 py-1.5 font-medium text-gray-800",
        "transition-colors duration-75 hover:bg-gray-100 hover:text-gray-800 active:bg-gray-200",
      )}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Component>
  );
}
