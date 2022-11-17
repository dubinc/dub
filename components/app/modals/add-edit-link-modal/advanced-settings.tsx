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
  const { url, title, description, image, password, expiresAt } = data;

  const { utm_source, utm_medium, utm_campaign } = useMemo(() => {
    return getParamsFromURL(url);
  }, [url]);

  return (
    <div>
      <div className="relative">
        <div
          className="absolute inset-0 flex items-center px-4 sm:px-16"
          aria-hidden="true"
        >
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-2 text-sm text-gray-500">Optional</span>
        </div>
      </div>

      <div className="mt-4 grid px-4 sm:px-16">
        <UTMSection {...{ data, setData }} />

        <OGSection {...{ data, setData }} />

        <PasswordSection {...{ data, setData }} />

        <ExpirationSection {...{ data, setData }} />
      </div>
    </div>
  );
}
