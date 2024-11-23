"use client";

import { destroy, DubOptions, init } from "@dub/embed-core";
import { useEffect } from "react";

export const DubDashboard = (options: DubOptions) => {
  useEffect(() => {
    init({
      ...options,
      type: "dashboard",
    });

    return () => destroy();
  }, [options]);

  return null;
};
