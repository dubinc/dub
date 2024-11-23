"use client";

import { destroy, DubOptions, init } from "@dub/embed-core";
import { useEffect } from "react";

export const DubWidget = (options: DubOptions) => {
  useEffect(() => {
    init({
      ...options,
      type: "widget",
    });

    return () => destroy();
  }, [options]);

  return null;
};
