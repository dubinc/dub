"use client";

import { ReactNode } from "react";
import { nFormatter } from "#/lib/utils";
import Tooltip from "#/ui/tooltip";

export default function Number({
  value,
  unit = "clicks",
  children,
}: {
  value?: number | null;
  unit?: string;
  children: ReactNode;
}) {
  if (!value || value < 1000) {
    return children;
  }
  return (
    <Tooltip content={`${nFormatter(value, { full: true })} ${unit}`}>
      {children}
    </Tooltip>
  );
}
