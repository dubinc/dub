import * as React from "react";

export function useLazyRef<T>(fn: () => T): React.MutableRefObject<T> {
  const ref = React.useRef<T | null>(null);
  if (ref.current === null) {
    ref.current = fn();
  }
  return ref as React.MutableRefObject<T>;
}
