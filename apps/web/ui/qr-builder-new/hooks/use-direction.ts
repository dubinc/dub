import * as React from "react";
import type { Direction } from "../types/file-upload";

export const DirectionContext = React.createContext<Direction | undefined>(
  undefined,
);

export function useDirection(dirProp?: Direction): Direction {
  const contextDir = React.useContext(DirectionContext);
  return dirProp ?? contextDir ?? "ltr";
}
