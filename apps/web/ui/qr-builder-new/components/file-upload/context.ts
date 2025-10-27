import * as React from "react";
import { FILE_UPLOAD_ERRORS, ROOT_NAME } from "../../constants/file-upload";
import { useLazyRef } from "../../hooks/use-lazy-ref";
import type {
  FileUploadContextValue,
  FileUploadItemContextValue,
  StoreState,
} from "../../types/file-upload";
import type { createStore } from "./store";

// Store Context
export const StoreContext = React.createContext<ReturnType<
  typeof createStore
> | null>(null);
StoreContext.displayName = ROOT_NAME;

export function useStoreContext(name: keyof typeof FILE_UPLOAD_ERRORS) {
  const context = React.useContext(StoreContext);
  if (!context) {
    throw new Error(FILE_UPLOAD_ERRORS[name]);
  }
  return context;
}

export function useStore<T>(selector: (state: StoreState) => T): T {
  const store = useStoreContext(ROOT_NAME);

  const lastValueRef = useLazyRef<{ value: T; state: StoreState } | null>(
    () => null,
  );

  const getSnapshot = React.useCallback(() => {
    const state = store.getState();
    const nextValue = selector(state);
    const prevValue = lastValueRef.current;

    // Fix progress bar updates: detect changes in selected values, not state object
    if (prevValue && prevValue.value === nextValue) {
      return prevValue.value;
    }

    lastValueRef.current = { value: nextValue, state };
    return nextValue;
  }, [store, selector, lastValueRef]);

  return React.useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

// FileUpload Context
export const FileUploadContext =
  React.createContext<FileUploadContextValue | null>(null);

export function useFileUploadContext(name: keyof typeof FILE_UPLOAD_ERRORS) {
  const context = React.useContext(FileUploadContext);
  if (!context) {
    throw new Error(FILE_UPLOAD_ERRORS[name]);
  }
  return context;
}

// FileUploadItem Context
export const FileUploadItemContext =
  React.createContext<FileUploadItemContextValue | null>(null);

export function useFileUploadItemContext(
  name: keyof typeof FILE_UPLOAD_ERRORS,
) {
  const context = React.useContext(FileUploadItemContext);
  if (!context) {
    throw new Error(FILE_UPLOAD_ERRORS[name]);
  }
  return context;
}
