"use client";

import { destroy, DubOptions, init } from "@dub/embed-core";
import { useEffect } from "react";

export const DubWidget = (options: Omit<DubOptions, "type">) => {
  useEffect(() => {
    init({
      ...options,
      type: "widget",
    });

    return () => destroy();
  }, [options]);

  return null;
};
