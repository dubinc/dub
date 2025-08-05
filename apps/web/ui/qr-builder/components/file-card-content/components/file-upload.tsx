"use client";

import { cn } from "@dub/utils";
import { Slot } from "@radix-ui/react-slot";
import {
  FileArchiveIcon,
  FileAudioIcon,
  FileCodeIcon,
  FileCogIcon,
  FileIcon,
  FileTextIcon,
  FileVideoIcon,
} from "lucide-react";
import * as React from "react";

const ROOT_NAME = "FileUpload";
const DROPZONE_NAME = "FileUploadDropzone";
const TRIGGER_NAME = "FileUploadTrigger";
const LIST_NAME = "FileUploadList";
const ITEM_NAME = "FileUploadItem";
const ITEM_PREVIEW_NAME = "FileUploadItemPreview";
const ITEM_METADATA_NAME = "FileUploadItemMetadata";
const ITEM_PROGRESS_NAME = "FileUploadItemProgress";
const ITEM_DELETE_NAME = "FileUploadItemDelete";
const CLEAR_NAME = "FileUploadClear";

const FILE_UPLOAD_ERRORS = {
  [ROOT_NAME]: `\`${ROOT_NAME}\` must be used as root component`,
  [DROPZONE_NAME]: `\`${DROPZONE_NAME}\` must be within \`${ROOT_NAME}\``,
  [TRIGGER_NAME]: `\`${TRIGGER_NAME}\` must be within \`${ROOT_NAME}\``,
  [LIST_NAME]: `\`${LIST_NAME}\` must be within \`${ROOT_NAME}\``,
  [ITEM_NAME]: `\`${ITEM_NAME}\` must be within \`${ROOT_NAME}\``,
  [ITEM_PREVIEW_NAME]: `\`${ITEM_PREVIEW_NAME}\` must be within \`${ITEM_NAME}\``,
  [ITEM_METADATA_NAME]: `\`${ITEM_METADATA_NAME}\` must be within \`${ITEM_NAME}\``,
  [ITEM_PROGRESS_NAME]: `\`${ITEM_PROGRESS_NAME}\` must be within \`${ITEM_NAME}\``,
  [ITEM_DELETE_NAME]: `\`${ITEM_DELETE_NAME}\` must be within \`${ITEM_NAME}\``,
  [CLEAR_NAME]: `\`${CLEAR_NAME}\` must be within \`${ROOT_NAME}\``,
} as const;

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

function useAsRef<T>(data: T) {
  const ref = React.useRef<T>(data);
  useIsomorphicLayoutEffect(() => {
    ref.current = data;
  });
  return ref;
}

function useLazyRef<T>(fn: () => T) {
  const ref = React.useRef<T | null>(null);
  if (ref.current === null) {
    ref.current = fn();
  }
  return ref as React.RefObject<T>;
}

type Direction = "ltr" | "rtl";

const DirectionContext = React.createContext<Direction | undefined>(undefined);

function useDirection(dirProp?: Direction): Direction {
  const contextDir = React.useContext(DirectionContext);
  return dirProp ?? contextDir ?? "ltr";
}

interface FileState {
  file: File;
  progress: number;
  error?: string;
  status: "idle" | "uploading" | "error" | "success";
}

interface StoreState {
  files: Map<File, FileState>;
  dragOver: boolean;
  invalid: boolean;
}

type StoreAction =
  | { variant: "ADD_FILES"; files: File[] }
  | { variant: "SET_FILES"; files: File[] }
  | { variant: "SET_PROGRESS"; file: File; progress: number }
  | { variant: "SET_SUCCESS"; file: File }
  | { variant: "SET_ERROR"; file: File; error: string }
  | { variant: "REMOVE_FILE"; file: File }
  | { variant: "SET_DRAG_OVER"; dragOver: boolean }
  | { variant: "SET_INVALID"; invalid: boolean }
  | { variant: "CLEAR" };

function createStore(
  listeners: Set<() => void>,
  files: Map<File, FileState>,
  onValueChange?: (files: File[]) => void,
  invalid?: boolean,
) {
  const initialState: StoreState = {
    files,
    dragOver: false,
    invalid: invalid ?? false,
  };

  let state = initialState;

  function reducer(state: StoreState, action: StoreAction): StoreState {
    switch (action.variant) {
      case "ADD_FILES": {
        for (const file of action.files) {
          files.set(file, {
            file,
            progress: 0,
            status: "idle",
          });
        }

        if (onValueChange) {
          const fileList = Array.from(files.values()).map(
            (fileState) => fileState.file,
          );
          onValueChange(fileList);
        }
        return { ...state, files };
      }

      case "SET_FILES": {
        const newFileSet = new Set(action.files);
        for (const existingFile of files.keys()) {
          if (!newFileSet.has(existingFile)) {
            files.delete(existingFile);
          }
        }

        for (const file of action.files) {
          const existingState = files.get(file);
          if (!existingState) {
            const customFile = file as File & {
              uploadStatus: "success";
              uploadProgress: number;
              fileId: string;
            };
            const isAlreadyUploaded =
              customFile.uploadStatus === "success" ||
              customFile.uploadProgress === 100 ||
              customFile.fileId;

            files.set(file, {
              file,
              progress: isAlreadyUploaded ? 100 : 0,
              status: isAlreadyUploaded ? "success" : "idle",
            });
          }
        }
        return { ...state, files };
      }

      case "SET_PROGRESS": {
        const fileState = files.get(action.file);
        if (fileState) {
          files.set(action.file, {
            ...fileState,
            progress: action.progress,
            status: "uploading",
          });
        }
        return { ...state, files };
      }

      case "SET_SUCCESS": {
        const fileState = files.get(action.file);
        if (fileState) {
          files.set(action.file, {
            ...fileState,
            progress: 100,
            status: "success",
          });
        }
        return { ...state, files };
      }

      case "SET_ERROR": {
        const fileState = files.get(action.file);
        if (fileState) {
          files.set(action.file, {
            ...fileState,
            error: action.error,
            status: "error",
          });
        }
        return { ...state, files };
      }

      case "REMOVE_FILE": {
        files.delete(action.file);

        if (onValueChange) {
          const fileList = Array.from(files.values()).map(
            (fileState) => fileState.file,
          );
          onValueChange(fileList);
        }
        return { ...state, files };
      }

      case "SET_DRAG_OVER": {
        return { ...state, dragOver: action.dragOver };
      }

      case "SET_INVALID": {
        return { ...state, invalid: action.invalid };
      }

      case "CLEAR": {
        files.clear();
        if (onValueChange) {
          onValueChange([]);
        }
        return { ...state, files, invalid: false };
      }

      default:
        return state;
    }
  }

  function getState() {
    return state;
  }

  function dispatch(action: StoreAction) {
    state = reducer(state, action);
    for (const listener of listeners) {
      listener();
    }
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { getState, dispatch, subscribe };
}

const StoreContext = React.createContext<ReturnType<typeof createStore> | null>(
  null,
);
StoreContext.displayName = ROOT_NAME;

function useStoreContext(name: keyof typeof FILE_UPLOAD_ERRORS) {
  const context = React.useContext(StoreContext);
  if (!context) {
    throw new Error(FILE_UPLOAD_ERRORS[name]);
  }
  return context;
}

function useStore<T>(selector: (state: StoreState) => T): T {
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

interface FileUploadContextValue {
  inputId: string;
  dropzoneId: string;
  listId: string;
  labelId: string;
  disabled: boolean;
  dir: Direction;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

const FileUploadContext = React.createContext<FileUploadContextValue | null>(
  null,
);

function useFileUploadContext(name: keyof typeof FILE_UPLOAD_ERRORS) {
  const context = React.useContext(FileUploadContext);
  if (!context) {
    throw new Error(FILE_UPLOAD_ERRORS[name]);
  }
  return context;
}

interface FileUploadRootProps
  extends Omit<
    React.ComponentPropsWithoutRef<"div">,
    "defaultValue" | "onChange"
  > {
  value?: File[];
  defaultValue?: File[];
  onValueChange?: (files: File[]) => void;
  onAccept?: (files: File[]) => void;
  onFileAccept?: (file: File) => void;
  onFileReject?: (file: File, message: string) => void;
  onFileValidate?: (file: File) => string | null | undefined;
  onUpload?: (
    files: File[],
    options: {
      onProgress: (file: File, progress: number) => void;
      onSuccess: (file: File) => void;
      onError: (file: File, error: Error) => void;
    },
  ) => Promise<void> | void;
  accept?: string;
  maxFiles?: number;
  maxSize?: number;
  dir?: Direction;
  label?: string;
  name?: string;
  asChild?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  multiple?: boolean;
  required?: boolean;
}

const FileUploadRoot = React.forwardRef<HTMLDivElement, FileUploadRootProps>(
  (props, forwardedRef) => {
    const {
      value,
      defaultValue,
      onValueChange,
      onAccept,
      onFileAccept,
      onFileReject,
      onFileValidate,
      onUpload,
      accept,
      maxFiles,
      maxSize,
      dir: dirProp,
      label,
      name,
      asChild,
      disabled = false,
      invalid = false,
      multiple = false,
      required = false,
      children,
      className,
      ...rootProps
    } = props;

    const inputId = React.useId();
    const dropzoneId = React.useId();
    const listId = React.useId();
    const labelId = React.useId();

    const dir = useDirection(dirProp);
    const propsRef = useAsRef(props);
    const listeners = useLazyRef(() => new Set<() => void>()).current;
    const files = useLazyRef<Map<File, FileState>>(() => new Map()).current;
    const inputRef = React.useRef<HTMLInputElement>(null);
    const isControlled = value !== undefined;

    const store = React.useMemo(
      () => createStore(listeners, files, onValueChange, invalid),
      [listeners, files, onValueChange, invalid],
    );

    const contextValue = React.useMemo<FileUploadContextValue>(
      () => ({
        dropzoneId,
        inputId,
        listId,
        labelId,
        dir,
        disabled,
        inputRef,
      }),
      [dropzoneId, inputId, listId, labelId, dir, disabled],
    );

    React.useEffect(() => {
      if (isControlled) {
        store.dispatch({ variant: "SET_FILES", files: value });
      } else if (
        defaultValue &&
        defaultValue.length > 0 &&
        !store.getState().files.size
      ) {
        store.dispatch({ variant: "SET_FILES", files: defaultValue });
      }
    }, [value, defaultValue, isControlled, store]);

    const onFilesChange = React.useCallback(
      (originalFiles: File[]) => {
        if (propsRef.current.disabled) return;

        let filesToProcess = [...originalFiles];
        let invalid = false;

        if (propsRef.current.maxFiles) {
          const currentCount = store.getState().files.size;
          const remainingSlotCount = Math.max(
            0,
            propsRef.current.maxFiles - currentCount,
          );

          if (remainingSlotCount < filesToProcess.length) {
            const rejectedFiles = filesToProcess.slice(remainingSlotCount);
            invalid = true;

            filesToProcess = filesToProcess.slice(0, remainingSlotCount);

            for (const file of rejectedFiles) {
              let rejectionMessage = `Maximum ${propsRef.current.maxFiles} files allowed`;

              if (propsRef.current.onFileValidate) {
                const validationMessage = propsRef.current.onFileValidate(file);
                if (validationMessage) {
                  rejectionMessage = validationMessage;
                }
              }

              propsRef.current.onFileReject?.(file, rejectionMessage);
            }
          }
        }

        const acceptedFiles: File[] = [];
        const rejectedFiles: { file: File; message: string }[] = [];

        for (const file of filesToProcess) {
          let rejected = false;
          let rejectionMessage = "";

          if (propsRef.current.onFileValidate) {
            const validationMessage = propsRef.current.onFileValidate(file);
            if (validationMessage) {
              rejectionMessage = validationMessage;
              propsRef.current.onFileReject?.(file, rejectionMessage);
              rejected = true;
              invalid = true;
              continue;
            }
          }

          if (propsRef.current.accept) {
            const acceptTypes = propsRef.current.accept
              .split(",")
              .map((t) => t.trim());
            const fileType = file.type;
            const fileExtension = `.${file.name.split(".").pop()}`;

            if (
              !acceptTypes.some(
                (type) =>
                  type === fileType ||
                  type === fileExtension ||
                  (type.includes("/*") &&
                    fileType.startsWith(type.replace("/*", "/"))),
              )
            ) {
              rejectionMessage = "File type not accepted";
              propsRef.current.onFileReject?.(file, rejectionMessage);
              rejected = true;
              invalid = true;
            }
          }

          if (
            propsRef.current.maxSize &&
            file.size > propsRef.current.maxSize
          ) {
            rejectionMessage = "File too large";
            propsRef.current.onFileReject?.(file, rejectionMessage);
            rejected = true;
            invalid = true;
          }

          if (!rejected) {
            acceptedFiles.push(file);
          } else {
            rejectedFiles.push({ file, message: rejectionMessage });
          }
        }

        if (invalid) {
          store.dispatch({ variant: "SET_INVALID", invalid });
          setTimeout(() => {
            store.dispatch({ variant: "SET_INVALID", invalid: false });
          }, 2000);
        }

        if (acceptedFiles.length > 0) {
          store.dispatch({ variant: "ADD_FILES", files: acceptedFiles });

          if (isControlled && propsRef.current.onValueChange) {
            const currentFiles = Array.from(
              store.getState().files.values(),
            ).map((f) => f.file);
            propsRef.current.onValueChange([...currentFiles]);
          }

          if (propsRef.current.onAccept) {
            propsRef.current.onAccept(acceptedFiles);
          }

          for (const file of acceptedFiles) {
            propsRef.current.onFileAccept?.(file);
          }

          if (propsRef.current.onUpload) {
            requestAnimationFrame(() => {
              onFilesUpload(acceptedFiles);
            });
          }
        }
      },
      [store, isControlled, propsRef],
    );

    const onFilesUpload = React.useCallback(
      async (files: File[]) => {
        try {
          for (const file of files) {
            store.dispatch({ variant: "SET_PROGRESS", file, progress: 0 });
          }

          if (propsRef.current.onUpload) {
            await propsRef.current.onUpload(files, {
              onProgress: (file, progress) => {
                store.dispatch({
                  variant: "SET_PROGRESS",
                  file,
                  progress: Math.min(Math.max(0, progress), 100),
                });
              },
              onSuccess: (file) => {
                store.dispatch({ variant: "SET_SUCCESS", file });
              },
              onError: (file, error) => {
                store.dispatch({
                  variant: "SET_ERROR",
                  file,
                  error: error.message ?? "Upload failed",
                });
              },
            });
          } else {
            for (const file of files) {
              store.dispatch({ variant: "SET_SUCCESS", file });
            }
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Upload failed";
          for (const file of files) {
            store.dispatch({
              variant: "SET_ERROR",
              file,
              error: errorMessage,
            });
          }
        }
      },
      [store, propsRef.current.onUpload],
    );

    const onInputChange = React.useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        onFilesChange(files);
        event.target.value = "";
      },
      [onFilesChange],
    );

    const RootPrimitive = asChild ? Slot : "div";

    return (
      <DirectionContext.Provider value={dir}>
        <StoreContext.Provider value={store}>
          <FileUploadContext.Provider value={contextValue}>
            <RootPrimitive
              data-disabled={disabled ? "" : undefined}
              data-slot="file-upload"
              dir={dir}
              {...rootProps}
              ref={forwardedRef}
              className={cn(
                "relative flex max-w-2xl flex-col gap-2",
                className,
              )}
            >
              {children}
              <input
                type="file"
                id={inputId}
                aria-labelledby={labelId}
                aria-describedby={dropzoneId}
                ref={inputRef}
                tabIndex={-1}
                accept={accept}
                name={name}
                disabled={disabled}
                multiple={multiple}
                required={required}
                className="sr-only"
                onChange={onInputChange}
              />
              <span id={labelId} className="sr-only">
                {label ?? "File upload"}
              </span>
            </RootPrimitive>
          </FileUploadContext.Provider>
        </StoreContext.Provider>
      </DirectionContext.Provider>
    );
  },
);
FileUploadRoot.displayName = ROOT_NAME;

interface FileUploadDropzoneProps
  extends React.ComponentPropsWithoutRef<"div"> {
  asChild?: boolean;
}

const FileUploadDropzone = React.forwardRef<
  HTMLDivElement,
  FileUploadDropzoneProps
>((props, forwardedRef) => {
  const { asChild, className, ...dropzoneProps } = props;

  const context = useFileUploadContext(DROPZONE_NAME);
  const store = useStoreContext(DROPZONE_NAME);
  const dragOver = useStore((state) => state.dragOver);
  const invalid = useStore((state) => state.invalid);
  const propsRef = useAsRef(dropzoneProps);

  const onClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      propsRef.current?.onClick?.(event);

      if (event.defaultPrevented) return;

      const target = event.target;

      const isFromTrigger =
        target instanceof HTMLElement &&
        target.closest('[data-slot="file-upload-trigger"]');

      if (!isFromTrigger) {
        context.inputRef.current?.click();
      }
    },
    [context.inputRef, propsRef],
  );

  const onDragOver = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      propsRef.current?.onDragOver?.(event);

      if (event.defaultPrevented) return;

      event.preventDefault();
      store.dispatch({ variant: "SET_DRAG_OVER", dragOver: true });
    },
    [store, propsRef.current.onDragOver],
  );

  const onDragEnter = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      propsRef.current?.onDragEnter?.(event);

      if (event.defaultPrevented) return;

      event.preventDefault();
      store.dispatch({ variant: "SET_DRAG_OVER", dragOver: true });
    },
    [store, propsRef.current.onDragEnter],
  );

  const onDragLeave = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      propsRef.current?.onDragLeave?.(event);

      if (event.defaultPrevented) return;

      const relatedTarget = event.relatedTarget;
      if (
        relatedTarget &&
        relatedTarget instanceof Node &&
        event.currentTarget.contains(relatedTarget)
      ) {
        return;
      }

      event.preventDefault();
      store.dispatch({ variant: "SET_DRAG_OVER", dragOver: false });
    },
    [store, propsRef.current.onDragLeave],
  );

  const onDrop = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      propsRef.current?.onDrop?.(event);

      if (event.defaultPrevented) return;

      event.preventDefault();
      store.dispatch({ variant: "SET_DRAG_OVER", dragOver: false });

      const files = Array.from(event.dataTransfer.files);
      const inputElement = context.inputRef.current;
      if (!inputElement) return;

      const dataTransfer = new DataTransfer();
      for (const file of files) {
        dataTransfer.items.add(file);
      }

      inputElement.files = dataTransfer.files;
      inputElement.dispatchEvent(new Event("change", { bubbles: true }));
    },
    [store, context.inputRef, propsRef.current.onDrop],
  );

  const onPaste = React.useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      propsRef.current?.onPaste?.(event);

      if (event.defaultPrevented) return;

      event.preventDefault();
      store.dispatch({ variant: "SET_DRAG_OVER", dragOver: false });

      const items = event.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item?.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (files.length === 0) return;

      const inputElement = context.inputRef.current;
      if (!inputElement) return;

      const dataTransfer = new DataTransfer();
      for (const file of files) {
        dataTransfer.items.add(file);
      }

      inputElement.files = dataTransfer.files;
      inputElement.dispatchEvent(new Event("change", { bubbles: true }));
    },
    [store, context.inputRef, propsRef],
  );

  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      propsRef.current?.onKeyDown?.(event);

      if (
        !event.defaultPrevented &&
        (event.key === "Enter" || event.key === " ")
      ) {
        event.preventDefault();
        context.inputRef.current?.click();
      }
    },
    [context.inputRef, propsRef.current.onKeyDown],
  );

  const DropzonePrimitive = asChild ? Slot : "div";

  return (
    <DropzonePrimitive
      role="region"
      id={context.dropzoneId}
      aria-controls={`${context.inputId} ${context.listId}`}
      aria-disabled={context.disabled}
      aria-invalid={invalid}
      data-disabled={context.disabled ? "" : undefined}
      data-dragging={dragOver ? "" : undefined}
      data-invalid={invalid ? "" : undefined}
      data-slot="file-upload-dropzone"
      dir={context.dir}
      tabIndex={context.disabled ? undefined : 0}
      {...dropzoneProps}
      ref={forwardedRef}
      className={cn(
        "hover:bg-accent/30 focus-visible:border-ring/50 data-[dragging]:border-primary data-[invalid]:border-destructive data-[invalid]:ring-destructive/20 relative flex select-none flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 outline-none transition-colors data-[disabled]:pointer-events-none",
        className,
      )}
      onClick={onClick}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
    />
  );
});
FileUploadDropzone.displayName = DROPZONE_NAME;

interface FileUploadTriggerProps
  extends React.ComponentPropsWithoutRef<"button"> {
  asChild?: boolean;
}

const FileUploadTrigger = React.forwardRef<
  HTMLButtonElement,
  FileUploadTriggerProps
>((props, forwardedRef) => {
  const { asChild, ...triggerProps } = props;
  const context = useFileUploadContext(TRIGGER_NAME);
  const propsRef = useAsRef(triggerProps);

  const onClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      propsRef.current?.onClick?.(event);

      if (event.defaultPrevented) return;

      context.inputRef.current?.click();
    },
    [context.inputRef, propsRef.current],
  );

  const TriggerPrimitive = asChild ? Slot : "button";

  return (
    <TriggerPrimitive
      type="button"
      aria-controls={context.inputId}
      data-disabled={context.disabled ? "" : undefined}
      data-slot="file-upload-trigger"
      {...triggerProps}
      ref={forwardedRef}
      disabled={context.disabled}
      onClick={onClick}
    />
  );
});
FileUploadTrigger.displayName = TRIGGER_NAME;

interface FileUploadListProps extends React.ComponentPropsWithoutRef<"div"> {
  orientation?: "horizontal" | "vertical";
  asChild?: boolean;
  forceMount?: boolean;
}

const FileUploadList = React.forwardRef<HTMLDivElement, FileUploadListProps>(
  (props, forwardedRef) => {
    const {
      className,
      orientation = "vertical",
      asChild,
      forceMount,
      ...listProps
    } = props;

    const context = useFileUploadContext(LIST_NAME);

    const shouldRender =
      forceMount || useStore((state) => state.files.size > 0);

    if (!shouldRender) return null;

    const ListPrimitive = asChild ? Slot : "div";

    return (
      <ListPrimitive
        role="list"
        id={context.listId}
        aria-orientation={orientation}
        data-orientation={orientation}
        data-slot="file-upload-list"
        data-state={shouldRender ? "active" : "inactive"}
        dir={context.dir}
        {...listProps}
        ref={forwardedRef}
        className={cn(
          "data-[state=inactive]:fade-out-0 data-[state=active]:fade-in-0 data-[state=inactive]:slide-out-to-top-2 data-[state=active]:slide-in-from-top-2 data-[state=active]:animate-in data-[state=inactive]:animate-out flex flex-col gap-2",
          orientation === "horizontal" && "flex-row overflow-x-auto p-1.5",
          className,
        )}
      />
    );
  },
);
FileUploadList.displayName = LIST_NAME;

interface FileUploadItemContextValue {
  id: string;
  fileState: FileState | undefined;
  nameId: string;
  sizeId: string;
  statusId: string;
  messageId: string;
}

const FileUploadItemContext =
  React.createContext<FileUploadItemContextValue | null>(null);

function useFileUploadItemContext(name: keyof typeof FILE_UPLOAD_ERRORS) {
  const context = React.useContext(FileUploadItemContext);
  if (!context) {
    throw new Error(FILE_UPLOAD_ERRORS[name]);
  }
  return context;
}

interface FileUploadItemProps extends React.ComponentPropsWithoutRef<"div"> {
  value: File;
  asChild?: boolean;
}

const FileUploadItem = React.forwardRef<HTMLDivElement, FileUploadItemProps>(
  (props, forwardedRef) => {
    const { value, asChild, className, ...itemProps } = props;

    const id = React.useId();
    const statusId = `${id}-status`;
    const nameId = `${id}-name`;
    const sizeId = `${id}-size`;
    const messageId = `${id}-message`;

    const context = useFileUploadContext(ITEM_NAME);
    const fileState = useStore((state) => state.files.get(value));
    const fileCount = useStore((state) => state.files.size);
    const fileIndex = useStore((state) => {
      const files = Array.from(state.files.keys());
      return files.indexOf(value) + 1;
    });

    const itemContext = React.useMemo(
      () => ({
        id,
        fileState,
        nameId,
        sizeId,
        statusId,
        messageId,
      }),
      [id, fileState, statusId, nameId, sizeId, messageId],
    );

    if (!fileState) return null;

    const statusText = fileState.error
      ? `Error: ${fileState.error}`
      : fileState.status === "uploading"
        ? `Uploading: ${fileState.progress}% complete`
        : fileState.status === "success"
          ? "Upload complete"
          : "Ready to upload";

    const ItemPrimitive = asChild ? Slot : "div";

    return (
      <FileUploadItemContext.Provider value={itemContext}>
        <ItemPrimitive
          role="listitem"
          id={id}
          aria-setsize={fileCount}
          aria-posinset={fileIndex}
          aria-describedby={`${nameId} ${sizeId} ${statusId} ${
            fileState.error ? messageId : ""
          }`}
          aria-labelledby={nameId}
          data-slot="file-upload-item"
          dir={context.dir}
          {...itemProps}
          ref={forwardedRef}
          className={cn(
            "relative flex items-center gap-2.5 rounded-md border p-3",
            className,
          )}
        >
          {props.children}
          <span id={statusId} className="sr-only">
            {statusText}
          </span>
        </ItemPrimitive>
      </FileUploadItemContext.Provider>
    );
  },
);
FileUploadItem.displayName = ITEM_NAME;

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${sizes[i]}`;
}

function getFileIcon(file: File) {
  const type = file.type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (type.startsWith("video/")) {
    return <FileVideoIcon />;
  }

  if (type.startsWith("audio/")) {
    return <FileAudioIcon />;
  }

  if (
    type.startsWith("text/") ||
    ["txt", "md", "rtf", "pdf"].includes(extension)
  ) {
    return <FileTextIcon />;
  }

  if (
    [
      "html",
      "css",
      "js",
      "jsx",
      "ts",
      "tsx",
      "json",
      "xml",
      "php",
      "py",
      "rb",
      "java",
      "c",
      "cpp",
      "cs",
    ].includes(extension)
  ) {
    return <FileCodeIcon />;
  }

  if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(extension)) {
    return <FileArchiveIcon />;
  }

  if (
    ["exe", "msi", "app", "apk", "deb", "rpm"].includes(extension) ||
    type.startsWith("application/")
  ) {
    return <FileCogIcon />;
  }

  return <FileIcon />;
}

interface FileUploadItemPreviewProps
  extends React.ComponentPropsWithoutRef<"div"> {
  render?: (file: File) => React.ReactNode;
  asChild?: boolean;
}

const FileUploadItemPreview = React.forwardRef<
  HTMLDivElement,
  FileUploadItemPreviewProps
>((props, forwardedRef) => {
  const { render, asChild, children, className, ...previewProps } = props;

  const itemContext = useFileUploadItemContext(ITEM_PREVIEW_NAME);

  const onPreviewRender = React.useCallback(
    (file: File) => {
      if (render) return render(file);

      if (itemContext.fileState?.file.type.startsWith("image/")) {
        return (
          <img
            src={URL.createObjectURL(file)}
            alt={file.name}
            className="size-full object-cover"
            onLoad={(event) => {
              if (!(event.target instanceof HTMLImageElement)) return;
              URL.revokeObjectURL(event.target.src);
            }}
          />
        );
      }

      return getFileIcon(file);
    },
    [render, itemContext.fileState?.file.type],
  );

  if (!itemContext.fileState) return null;

  const ItemPreviewPrimitive = asChild ? Slot : "div";

  return (
    <ItemPreviewPrimitive
      aria-labelledby={itemContext.nameId}
      data-slot="file-upload-preview"
      {...previewProps}
      ref={forwardedRef}
      className={cn(
        "bg-accent/50 relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded border [&>svg]:size-10",
        className,
      )}
    >
      {onPreviewRender(itemContext.fileState.file)}
      {children}
    </ItemPreviewPrimitive>
  );
});
FileUploadItemPreview.displayName = ITEM_PREVIEW_NAME;

interface FileUploadItemMetadataProps
  extends React.ComponentPropsWithoutRef<"div"> {
  asChild?: boolean;
  size?: "default" | "sm";
}

const FileUploadItemMetadata = React.forwardRef<
  HTMLDivElement,
  FileUploadItemMetadataProps
>((props, forwardedRef) => {
  const {
    asChild,
    size = "default",
    children,
    className,
    ...metadataProps
  } = props;

  const context = useFileUploadContext(ITEM_METADATA_NAME);
  const itemContext = useFileUploadItemContext(ITEM_METADATA_NAME);

  if (!itemContext.fileState) return null;

  // Check if file is a thumbnail
  const file = itemContext.fileState.file as any;
  const isThumbnail = file?.isThumbnail;
  const originalFileName = file?.originalFileName;
  const originalFileSize = file?.originalFileSize;

  const displayName =
    isThumbnail && originalFileName
      ? originalFileName
      : itemContext.fileState.file.name;
  const displaySize =
    isThumbnail && originalFileSize
      ? formatBytes(originalFileSize)
      : formatBytes(itemContext.fileState.file.size);

  const ItemMetadataPrimitive = asChild ? Slot : "div";

  return (
    <ItemMetadataPrimitive
      data-slot="file-upload-metadata"
      dir={context.dir}
      {...metadataProps}
      ref={forwardedRef}
      className={cn("flex min-w-0 flex-1 flex-col", className)}
    >
      {children ?? (
        <>
          <span
            id={itemContext.nameId}
            className={cn(
              "truncate text-sm font-medium",
              size === "sm" && "text-[13px] font-normal leading-snug",
            )}
          >
            {displayName}
          </span>
          <span
            id={itemContext.sizeId}
            className={cn(
              "text-muted-foreground truncate text-xs",
              size === "sm" && "text-[11px]",
            )}
          >
            {displaySize}
          </span>
          {itemContext.fileState.error && (
            <span
              id={itemContext.messageId}
              className="text-destructive text-xs"
            >
              {itemContext.fileState.error}
            </span>
          )}
        </>
      )}
    </ItemMetadataPrimitive>
  );
});
FileUploadItemMetadata.displayName = ITEM_METADATA_NAME;

interface FileUploadItemProgressProps
  extends React.ComponentPropsWithoutRef<"div"> {
  asChild?: boolean;
  variant?: "linear" | "circular" | "fill";
  size?: number;
  forceMount?: boolean;
}

const FileUploadItemProgress = React.forwardRef<
  HTMLDivElement,
  FileUploadItemProgressProps
>((props, forwardedRef) => {
  const {
    variant = "linear",
    size = 40,
    asChild,
    forceMount,
    className,
    ...progressProps
  } = props;

  const itemContext = useFileUploadItemContext(ITEM_PROGRESS_NAME);

  if (!itemContext.fileState) return null;

  const shouldRender = forceMount || itemContext.fileState.progress !== 100;

  if (!shouldRender) return null;

  const ItemProgressPrimitive = asChild ? Slot : "div";

  switch (variant) {
    case "circular": {
      const circumference = 2 * Math.PI * ((size - 4) / 2);
      const strokeDashoffset =
        circumference - (itemContext.fileState.progress / 100) * circumference;

      return (
        <ItemProgressPrimitive
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={itemContext.fileState.progress}
          aria-valuetext={`${itemContext.fileState.progress}%`}
          aria-labelledby={itemContext.nameId}
          data-slot="file-upload-progress"
          {...progressProps}
          ref={forwardedRef}
          className={cn(
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            className,
          )}
        >
          <svg
            className="rotate-[-90deg] transform"
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            fill="none"
            stroke="currentColor"
          >
            <circle
              className="text-primary/20"
              strokeWidth="2"
              cx={size / 2}
              cy={size / 2}
              r={(size - 4) / 2}
            />
            <circle
              className="text-primary transition-[stroke-dashoffset] duration-300 ease-linear"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              cx={size / 2}
              cy={size / 2}
              r={(size - 4) / 2}
            />
          </svg>
        </ItemProgressPrimitive>
      );
    }

    case "fill": {
      const progressPercentage = itemContext.fileState.progress;
      const topInset = 100 - progressPercentage;

      return (
        <ItemProgressPrimitive
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercentage}
          aria-valuetext={`${progressPercentage}%`}
          aria-labelledby={itemContext.nameId}
          data-slot="file-upload-progress"
          {...progressProps}
          ref={forwardedRef}
          className={cn(
            "bg-primary/50 absolute inset-0 transition-[clip-path] duration-300 ease-linear",
            className,
          )}
          style={{
            clipPath: `inset(${topInset}% 0% 0% 0%)`,
          }}
        />
      );
    }

    default:
      return (
        <ItemProgressPrimitive
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={itemContext.fileState.progress}
          aria-valuetext={`${itemContext.fileState.progress}%`}
          aria-labelledby={itemContext.nameId}
          data-slot="file-upload-progress"
          {...progressProps}
          ref={forwardedRef}
          className={cn(
            "bg-primary/20 relative h-1.5 w-full overflow-hidden rounded-full",
            className,
          )}
        >
          <div
            className="bg-primary h-full w-full flex-1 transition-transform duration-300 ease-linear"
            style={{
              transform: `translateX(-${100 - itemContext.fileState.progress}%)`,
            }}
          />
        </ItemProgressPrimitive>
      );
  }
});
FileUploadItemProgress.displayName = ITEM_PROGRESS_NAME;

interface FileUploadItemDeleteProps
  extends React.ComponentPropsWithoutRef<"button"> {
  asChild?: boolean;
}

const FileUploadItemDelete = React.forwardRef<
  HTMLButtonElement,
  FileUploadItemDeleteProps
>((props, forwardedRef) => {
  const { asChild, ...deleteProps } = props;

  const store = useStoreContext(ITEM_DELETE_NAME);
  const itemContext = useFileUploadItemContext(ITEM_DELETE_NAME);
  const propsRef = useAsRef(deleteProps);

  const onClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      propsRef.current?.onClick?.(event);

      if (!itemContext.fileState || event.defaultPrevented) return;

      store.dispatch({
        variant: "REMOVE_FILE",
        file: itemContext.fileState.file,
      });
    },
    [store, itemContext.fileState, propsRef.current?.onClick],
  );

  if (!itemContext.fileState) return null;

  const ItemDeletePrimitive = asChild ? Slot : "button";

  return (
    <ItemDeletePrimitive
      type="button"
      aria-controls={itemContext.id}
      aria-describedby={itemContext.nameId}
      data-slot="file-upload-item-delete"
      {...deleteProps}
      ref={forwardedRef}
      onClick={onClick}
    />
  );
});
FileUploadItemDelete.displayName = ITEM_DELETE_NAME;

interface FileUploadClearProps
  extends React.ComponentPropsWithoutRef<"button"> {
  forceMount?: boolean;
  asChild?: boolean;
}

const FileUploadClear = React.forwardRef<
  HTMLButtonElement,
  FileUploadClearProps
>((props, forwardedRef) => {
  const { asChild, forceMount, disabled, ...clearProps } = props;

  const context = useFileUploadContext(CLEAR_NAME);
  const store = useStoreContext(CLEAR_NAME);
  const propsRef = useAsRef(clearProps);

  const isDisabled = disabled || context.disabled;

  const onClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      propsRef.current?.onClick?.(event);

      if (event.defaultPrevented) return;

      store.dispatch({ variant: "CLEAR" });
    },
    [store, propsRef],
  );

  const shouldRender = forceMount || useStore((state) => state.files.size > 0);

  if (!shouldRender) return null;

  const ClearPrimitive = asChild ? Slot : "button";

  return (
    <ClearPrimitive
      type="button"
      aria-controls={context.listId}
      data-slot="file-upload-clear"
      data-disabled={isDisabled ? "" : undefined}
      {...clearProps}
      ref={forwardedRef}
      disabled={isDisabled}
      onClick={onClick}
    />
  );
});
FileUploadClear.displayName = CLEAR_NAME;

const FileUpload = FileUploadRoot;
const Root = FileUploadRoot;
const Trigger = FileUploadTrigger;
const Dropzone = FileUploadDropzone;
const List = FileUploadList;
const Item = FileUploadItem;
const ItemPreview = FileUploadItemPreview;
const ItemMetadata = FileUploadItemMetadata;
const ItemProgress = FileUploadItemProgress;
const ItemDelete = FileUploadItemDelete;
const Clear = FileUploadClear;

export {
  Clear,
  Dropzone,
  FileUpload,
  FileUploadClear,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadItemProgress,
  FileUploadList,
  FileUploadTrigger,
  Item,
  ItemDelete,
  ItemMetadata,
  ItemPreview,
  ItemProgress,
  List,
  //
  Root,
  Trigger,
  //
  useStore as useFileUpload,
};
