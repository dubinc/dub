import * as React from "react";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect";

export function useAsRef<T>(data: T) {
  const ref = React.useRef<T>(data);
  useIsomorphicLayoutEffect(() => {
    ref.current = data;
  });
  return ref;
}
