"use client";

import { destroy, DubOptions, init } from "@dub/embed-core";
import { useEffect } from "react";

export const DubDashboard = (
  options: Omit<
    DubOptions,
    | "type"
    | "buttonStyle"
    | "trigger"
    | "containerStyles"
    | "popupStyles"
    | "buttonStyles"
  >,
) => {
  useEffect(() => {
    init({
      ...options,
      type: "dashboard",
    });

    return () => destroy();
  }, [options]);

  return null;
};
