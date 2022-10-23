import { Dispatch, SetStateAction, useMemo, useState } from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { motion } from "framer-motion";
import { CheckCircleFill, ChevronRight } from "@/components/shared/icons";
import { LinkProps } from "@/lib/types";
import { getParamsFromURL } from "@/lib/utils";
import ExpirationSection from "./expiration-section";
import OGSection from "./og-section";
import PasswordSection from "./password-section";
import UTMSection from "./utm-section";

export const AnimationSettings = {
  initial: { height: 0 },
  animate: { height: "auto" },
  exit: { height: 0 },
  transition: { duration: 0.2, bounce: 0 },
};

export default function AdvancedSettings({
  data,
  setData,
}: {
  data: LinkProps;
  setData: Dispatch<SetStateAction<LinkProps>>;
}) {
  const [expanded, setExpanded] = useState(false);

  const { url, title, description, image, password, expiresAt } = data;

  const { utm_source, utm_medium, utm_campaign } = useMemo(() => {
    return getParamsFromURL(url);
  }, [url]);

  return (
    <div>
      <div className="sm:px-16 px-4">
        <button
          type="button"
          className="flex items-center space-x-2"
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronRight
            className={`h-5 w-5 text-gray-600 ${
              expanded ? "rotate-90" : ""
            } transition-all`}
          />
          <p className="text-gray-600 text-sm">Advanced options</p>
        </button>
      </div>

      {expanded && (
        <motion.div key="accordion-root" {...AnimationSettings}>
          <AccordionPrimitive.Root
            type="single"
            collapsible={true}
            className="mt-4 grid bg-white border-t border-b border-gray-200 px-2 sm:px-8 py-8"
          >
            {/* UTM Builder Section */}
            <AccordionPrimitive.Item
              value="utm"
              className="border border-gray-200 rounded-t-lg"
            >
              <AccordionPrimitive.Header>
                <AccordionPrimitive.Trigger className="group focus:outline-black flex w-full items-center justify-between space-x-2 p-5 text-left rounded-t-lg hover:bg-gray-50 active:bg-gray-100 transition-all duration-75">
                  <div className="flex items-center justify-start space-x-2 h-6">
                    <ChevronRight className="h-5 w-5 shrink-0 text-gray-700 ease-in-out group-radix-state-open:rotate-90 transition-all" />
                    <span className="text-sm font-medium text-gray-900">
                      UTM Builder
                    </span>
                  </div>
                  {utm_source && utm_medium && utm_campaign && (
                    <CheckCircleFill className="h-6 w-6 text-black" />
                  )}
                </AccordionPrimitive.Trigger>
              </AccordionPrimitive.Header>
              <AccordionPrimitive.Content className="pb-3">
                <UTMSection {...{ data, setData }} />
              </AccordionPrimitive.Content>
            </AccordionPrimitive.Item>

            {/* OG Tags Section */}
            <AccordionPrimitive.Item
              value="og"
              className="border border-gray-200 border-t-0"
            >
              <AccordionPrimitive.Header>
                <AccordionPrimitive.Trigger className="group focus:outline-black flex w-full items-center justify-between space-x-2 p-5 text-left hover:bg-gray-50 active:bg-gray-100 transition-all duration-75">
                  <div className="flex items-center justify-start space-x-2 h-6">
                    <ChevronRight className="h-5 w-5 shrink-0 text-gray-700 ease-in-out group-radix-state-open:rotate-90 transition-all" />
                    <span className="text-sm font-medium text-gray-900">
                      Custom OG Tags
                    </span>
                  </div>
                  {title && description && image && (
                    <CheckCircleFill className="h-6 w-6 text-black" />
                  )}
                </AccordionPrimitive.Trigger>
              </AccordionPrimitive.Header>
              <AccordionPrimitive.Content className="pb-3">
                <OGSection {...{ data, setData }} />
              </AccordionPrimitive.Content>
            </AccordionPrimitive.Item>

            {/* Password Protection */}
            <AccordionPrimitive.Item
              value="password"
              className="border border-gray-200 border-t-0"
            >
              <AccordionPrimitive.Header>
                <AccordionPrimitive.Trigger className="group focus:outline-black flex w-full items-center justify-between space-x-2 p-5 text-left hover:bg-gray-50 active:bg-gray-100 transition-all duration-75">
                  <div className="flex items-center justify-start space-x-2 h-6">
                    <ChevronRight className="h-5 w-5 shrink-0 text-gray-700 ease-in-out group-radix-state-open:rotate-90 transition-all" />
                    <span className="text-sm font-medium text-gray-900">
                      Password Protection
                    </span>
                  </div>
                  {password && (
                    <CheckCircleFill className="h-6 w-6 text-black" />
                  )}
                </AccordionPrimitive.Trigger>
              </AccordionPrimitive.Header>
              <AccordionPrimitive.Content className="px-5 pb-3">
                <PasswordSection {...{ data, setData }} />
              </AccordionPrimitive.Content>
            </AccordionPrimitive.Item>

            {/* Expiration Date */}
            <AccordionPrimitive.Item
              value="expire"
              className="border border-gray-200 border-t-0 rounded-b-lg overflow-hidden"
            >
              <AccordionPrimitive.Header>
                <AccordionPrimitive.Trigger className="group focus:outline-black flex w-full items-center justify-between space-x-2 p-5 text-left hover:bg-gray-50 active:bg-gray-100 transition-all duration-75">
                  <div className="flex items-center justify-start space-x-2 h-6">
                    <ChevronRight className="h-5 w-5 shrink-0 text-gray-700 ease-in-out group-radix-state-open:rotate-90 transition-all" />
                    <span className="text-sm font-medium text-gray-900">
                      Expiration Date
                    </span>
                    {expiresAt &&
                      new Date().getTime() > new Date(expiresAt).getTime() && (
                        <span className="bg-amber-500 px-2 py-0.5 text-xs text-white uppercase">
                          Expired
                        </span>
                      )}
                  </div>
                  {expiresAt && (
                    <CheckCircleFill className="h-6 w-6 text-black" />
                  )}
                </AccordionPrimitive.Trigger>
              </AccordionPrimitive.Header>
              <AccordionPrimitive.Content className="px-5 pb-3">
                <ExpirationSection {...{ data, setData }} />
              </AccordionPrimitive.Content>
            </AccordionPrimitive.Item>
          </AccordionPrimitive.Root>
        </motion.div>
      )}
    </div>
  );
}
