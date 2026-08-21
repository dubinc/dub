import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Returns a stable function that always invokes the latest `callback`,
 * so it can be passed to memoized children (or used in effects) without
 * their identity changing when the callback is recreated by the caller.
 */
export function useLatestCallback<T extends (...args: any[]) => any>(
  callback: T | undefined,
) {
  const callbackRef = useRef(callback);

  useIsomorphicLayoutEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback(
    (...args: Parameters<T>) => callbackRef.current?.(...args) as ReturnType<T>,
    [],
  );
}
