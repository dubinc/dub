"use client";

import { IntervalOptions } from "@/lib/analytics/types";
import { createContext } from "react";

export const ProgramOverviewContext = createContext<{
  start?: Date;
  end?: Date;
  interval?: IntervalOptions;
  color?: string;
}>({});
