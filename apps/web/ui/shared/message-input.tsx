import {
  MAX_ATTACHMENTS_PER_MESSAGE,
  MAX_MESSAGE_LENGTH,
} from "@/lib/messages/constants";
import { messageAttachmentInputSchema } from "@/lib/messages/schemas";
import {
  getAttachmentTypeLabel,
  isPreviewableImageType,
} from "@/lib/messages/utils";
import {
  ArrowTurnLeft,
  Button,
  FaceSmile,
  LoadingCircle,
  RichTextArea,
  RichTextProvider,
  RichTextToolbar,
  RichTextToolbarButton,
  useRichTextContext,
  useScrollProgress,
} from "@dub/ui";
import { cn, formatFileSize, nFormatter } from "@dub/utils";
import { File, Paperclip, X } from "lucide-react";
import {
  DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { toast } from "sonner";
import * as z from "zod/v4";
import { ATTACHMENT_MIME_TYPE_COLOR } from "../messages/message-attachments";
import { EmojiPicker } from "../shared/emoji-picker";

export type PendingAttachment = Omit<
  z.infer<typeof messageAttachmentInputSchema>,
  "storageKey"
> & {
  id: string;
  file: File;
  storageKey?: string;
  uploading: boolean;
};

export function MessageInput({
  onSendMessage,
  defaultValue,
  onCancel,
  autoFocus,
  placeholder = "Type a message...",
  sendButtonText = "Send",
  className,
  attachments = [],
  onAddFiles,
  onRemoveAttachment,
  allowedFileTypes,
  maxAttachments = MAX_ATTACHMENTS_PER_MESSAGE,
}: {
  onSendMessage: (
    message: string,
    attachments: z.infer<typeof messageAttachmentInputSchema>[],
  ) => void | false;
  defaultValue?: string;
  onCancel?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
  sendButtonText?: string;
  className?: string;
  attachments?: PendingAttachment[];
  onAddFiles?: (files: File[]) => void;
  onRemoveAttachment?: (id: string) => void;
  allowedFileTypes?: readonly string[];
  maxAttachments?: number;
}) {
  const richTextRef = useRef<{ setContent: (content: any) => void }>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [typedMessage, setTypedMessage] = useState(defaultValue || "");
  const [emojiPickerOpen, setEmojiPickerOpenState] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [cursorRect, setCursorRect] = useState<{
    top: number;
    bottom: number;
    left: number;
    right: number;
  } | null>(null);
  const stripColonOnEmojiPickRef = useRef(false);

  const setEmojiPickerOpen = useCallback((open: boolean) => {
    stripColonOnEmojiPickRef.current = false;
    if (!open) setCursorRect(null);
    setEmojiPickerOpenState(open);
  }, []);

  const hasCompletedAttachments = attachments.some(
    (a) => !a.uploading && a.storageKey,
  );
  const hasUploading = attachments.some((a) => a.uploading);
  const hasText = typedMessage.trim().length > 0;
  const isTooLong = typedMessage.trim().length >= MAX_MESSAGE_LENGTH;

  const isSendDisabled =
    (!hasText && !hasCompletedAttachments) || isTooLong || hasUploading;

  const sendMessage = () => {
    if (isSendDisabled) return;

    const message = typedMessage.trim();
    const completedAttachments = attachments
      .filter((a) => !a.uploading && a.storageKey)
      .map((a) => ({
        storageKey: a.storageKey!,
        name: a.name,
        size: a.size,
        type: a.type,
      }));

    if (!message && completedAttachments.length === 0) return;

    if (onSendMessage(message, completedAttachments) !== false) {
      setTypedMessage("");
      richTextRef.current?.setContent("");
    }
  };

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      if (!onAddFiles) return;

      const fileArray = Array.from(files);
      const allowedFileTypeSet = allowedFileTypes
        ? new Set(allowedFileTypes)
        : null;
      const supportedFiles = allowedFileTypeSet
        ? fileArray.filter((file) => allowedFileTypeSet.has(file.type))
        : fileArray;
      const unsupportedFiles = allowedFileTypeSet
        ? fileArray.filter((file) => !allowedFileTypeSet.has(file.type))
        : [];

      if (unsupportedFiles.length > 0 && allowedFileTypes) {
        toast.error(getUnsupportedFileTypeMessage(allowedFileTypes));
      }

      if (supportedFiles.length === 0) return;

      const remaining = maxAttachments - attachments.length;

      if (remaining <= 0) {
        toast.error(`Maximum ${maxAttachments} attachments per message`);
        return;
      }

      const filesToAdd = supportedFiles.slice(0, remaining);
      if (supportedFiles.length > remaining) {
        toast.error(`Maximum ${maxAttachments} attachments per message`);
      }

      onAddFiles(filesToAdd);
    },
    [onAddFiles, attachments.length, maxAttachments, allowedFileTypes],
  );

  const handleDragEvent = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const acceptString = useMemo(
    () => (allowedFileTypes ? allowedFileTypes.join(",") : undefined),
    [allowedFileTypes],
  );

  return (
    <div
      className={cn(
        "border-border-subtle relative overflow-hidden rounded-xl border focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500",
        className,
      )}
      onDragOver={(e) => {
        handleDragEvent(e);
        if (onAddFiles) setDragActive(true);
      }}
      onDragEnter={(e) => {
        handleDragEvent(e);
        if (onAddFiles) setDragActive(true);
      }}
      onDragLeave={(e) => {
        handleDragEvent(e);
        setDragActive(false);
      }}
      onDrop={(e) => {
        handleDragEvent(e);
        setDragActive(false);
        if (e.dataTransfer.files?.length) {
          handleFiles(e.dataTransfer.files);
        }
      }}
    >
      {/* Drag overlay */}
      {dragActive && onAddFiles && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-neutral-400 bg-neutral-50/90">
          <div className="text-center">
            <p className="text-sm font-medium text-neutral-600">
              Drop to upload
            </p>
            <p className="text-xs text-neutral-400">Upload files up to 10MB</p>
          </div>
        </div>
      )}

      <RichTextProvider
        ref={richTextRef}
        features={["bold", "italic", "links"]}
        style="condensed"
        markdown
        autoFocus={autoFocus}
        placeholder={placeholder}
        editorClassName="block max-h-[min(40dvh,15rem)] w-full resize-none border-none overflow-auto scrollbar-hide p-3 text-base sm:max-h-64 sm:text-sm md:max-h-80 lg:max-h-96"
        initialValue={defaultValue}
        onChange={(editor) => setTypedMessage((editor as any).getMarkdown())}
        editorProps={{
          handleDOMEvents: {
            keydown: (view, e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                e.stopPropagation();
                sendMessage();
                return false;
              }
              if (e.key === ":" && !e.metaKey && !e.ctrlKey && !e.altKey) {
                const { $from } = view.state.selection;
                const afterHardBreak =
                  $from.nodeBefore?.type.name === "hardBreak";
                const atBlockStart = $from.parentOffset === 0;
                const afterWhitespace =
                  $from.parentOffset > 0 &&
                  /\s/.test(
                    $from.parent.textBetween(
                      $from.parentOffset - 1,
                      $from.parentOffset,
                    ),
                  );
                if (atBlockStart || afterWhitespace || afterHardBreak) {
                  const coords = view.coordsAtPos(view.state.selection.from);
                  setCursorRect(coords);
                  setTimeout(() => {
                    stripColonOnEmojiPickRef.current = true;
                    setEmojiPickerOpenState(true);
                  }, 0);
                }
              }
            },
          },
        }}
      >
        <div className="relative">
          <RichTextArea />
          <MessageInputEditorOverflowFades />
        </div>

        {/* Attachment preview strip */}
        {attachments.length > 0 && (
          <div className="scrollbar-hide flex gap-2 overflow-x-auto px-3 py-2">
            {attachments.map((att) => (
              <AttachmentChip
                key={att.id}
                attachment={att}
                onRemove={() => onRemoveAttachment?.(att.id)}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-4 p-3">
          <MessageInputToolbar
            emojiPickerOpen={emojiPickerOpen}
            setEmojiPickerOpen={setEmojiPickerOpen}
            stripColonOnEmojiPickRef={stripColonOnEmojiPickRef}
            cursorRect={cursorRect}
            onAttachClick={
              onAddFiles ? () => fileInputRef.current?.click() : undefined
            }
          />
          <div className="flex items-center justify-between gap-2">
            {onCancel && (
              <Button
                variant="secondary"
                text="Cancel"
                onClick={onCancel}
                className="h-8 w-fit rounded-lg px-4"
              />
            )}
            <Button
              variant="primary"
              text={
                <span className="flex items-center gap-2">
                  {sendButtonText}
                  <span className="hidden items-center gap-1 sm:flex">
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded border text-[0.625rem]",
                        isSendDisabled
                          ? "border-neutral-300 text-neutral-400"
                          : "border-neutral-700 group-disabled:border-neutral-300 group-disabled:text-neutral-400",
                      )}
                    >
                      {navigator.platform.startsWith("Mac") ? "⌘" : "^"}
                    </span>
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded border",
                        isSendDisabled
                          ? "border-neutral-300"
                          : "border-neutral-700 group-disabled:border-neutral-300",
                      )}
                    >
                      <ArrowTurnLeft
                        className={cn(
                          "size-2.5",
                          isSendDisabled
                            ? "text-neutral-400"
                            : "text-content-inverted group-disabled:text-neutral-400",
                        )}
                      />
                    </span>
                  </span>
                </span>
              }
              disabled={isSendDisabled}
              disabledTooltip={
                isTooLong
                  ? `Message must be less than ${nFormatter(MAX_MESSAGE_LENGTH)} characters`
                  : hasUploading
                    ? "Please wait for uploads to complete"
                    : undefined
              }
              onClick={sendMessage}
              className="h-8 w-fit rounded-lg px-4"
            />
          </div>
        </div>
      </RichTextProvider>

      {/* Hidden file input */}
      {onAddFiles && (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptString}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              handleFiles(e.target.files);
            }
            e.target.value = "";
          }}
        />
      )}
    </div>
  );
}

function getUnsupportedFileTypeMessage(allowedFileTypes: readonly string[]) {
  if (allowedFileTypes.length === 0) {
    return "File type not supported.";
  }

  const allowedLabels = formatList(
    allowedFileTypes.map((type) => getAttachmentTypeLabel(type)),
  );

  return `File type not supported. Upload a ${allowedLabels}.`;
}

function formatList(items: string[]) {
  const uniqueItems = Array.from(new Set(items));

  if (uniqueItems.length <= 1) return uniqueItems[0] || "";
  if (uniqueItems.length === 2) return uniqueItems.join(" or ");

  return `${uniqueItems.slice(0, -1).join(", ")}, or ${
    uniqueItems[uniqueItems.length - 1]
  }`;
}

function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: PendingAttachment;
  onRemove: () => void;
}) {
  const isImage = isPreviewableImageType(attachment.type);
  const previewUrl = useMemo(
    () => (isImage ? URL.createObjectURL(attachment.file) : null),
    [attachment.file, isImage],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (isImage && previewUrl) {
    return (
      <div className="relative shrink-0">
        {attachment.uploading && (
          <div className="absolute inset-0 z-[1] flex items-center justify-center rounded-lg bg-white/80">
            <LoadingCircle className="size-4" />
          </div>
        )}
        <img
          src={previewUrl}
          alt={attachment.name}
          className="size-14 rounded-lg border border-neutral-200 object-cover"
        />
        <button
          type="button"
          onClick={onRemove}
          className="absolute -right-1.5 -top-1.5 z-[2] flex size-5 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-400 shadow-sm transition-colors hover:text-neutral-600"
        >
          <X className="size-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex h-14 shrink-0 items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-1 pr-8">
      {attachment.uploading && (
        <div className="absolute inset-0 z-[1] flex items-center justify-center rounded-lg bg-white/80">
          <LoadingCircle className="size-4" />
        </div>
      )}

      <div
        className={cn(
          "flex size-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md text-xs font-semibold uppercase text-white",
          ATTACHMENT_MIME_TYPE_COLOR[attachment.type] || "bg-neutral-500",
        )}
      >
        <File className="size-3 shrink-0" />
        <span>{getAttachmentTypeLabel(attachment.type)}</span>
      </div>

      <div className="flex min-w-0 max-w-[120px] flex-col">
        <span className="truncate text-sm font-medium text-neutral-700">
          {attachment.name}
        </span>
        <span className="text-xs text-neutral-400">
          {formatFileSize(attachment.size, 1)}
        </span>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="absolute -right-1.5 -top-1.5 z-[2] flex size-5 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-400 shadow-sm transition-colors hover:text-neutral-600"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

function MessageInputEditorOverflowFades() {
  const { editor } = useRichTextContext();
  const scrollElRef = useRef<HTMLElement | null>(null);
  const prevScrollTopRef = useRef(0);
  const [scrollDirection, setScrollDirection] = useState<"down" | "up" | null>(
    null,
  );

  const { scrollProgress, updateScrollProgress } = useScrollProgress(
    scrollElRef as RefObject<HTMLElement>,
  );

  useEffect(() => {
    if (!editor) return;

    const root = editor.view.dom as HTMLElement;
    const scrollEl =
      (editor.view as { scrollDOM?: HTMLElement }).scrollDOM ?? root;

    scrollElRef.current = scrollEl;
    updateScrollProgress();

    const onScroll = () => {
      setScrollDirection(
        scrollEl.scrollTop > prevScrollTopRef.current ? "down" : "up",
      );
      prevScrollTopRef.current = scrollEl.scrollTop;
      updateScrollProgress();
    };

    scrollEl.addEventListener("scroll", onScroll, { passive: true });

    const mutationObserver = new MutationObserver(updateScrollProgress);
    mutationObserver.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
    });

    return () => {
      scrollEl.removeEventListener("scroll", onScroll);
      mutationObserver.disconnect();
      scrollElRef.current = null;
    };
  }, [editor, updateScrollProgress]);

  const epsilon = 0.02;
  const hasOverflow = scrollProgress < 1 - epsilon || scrollProgress > epsilon;
  let showTopFade = false;
  let showBottomFade = false;

  if (hasOverflow) {
    if (scrollProgress <= epsilon) {
      showBottomFade = true;
    } else if (scrollProgress >= 1 - epsilon) {
      showTopFade = true;
    } else {
      showTopFade = scrollDirection === "down";
      showBottomFade = scrollDirection === "up";
    }
  }

  return (
    <>
      <div
        aria-hidden
        className={cn(
          "from-bg-default pointer-events-none absolute inset-x-0 top-0 z-[1] h-[20px] bg-gradient-to-b to-transparent transition-opacity duration-150 ease-out",
          showTopFade ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "from-bg-default pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[20px] bg-gradient-to-t to-transparent transition-opacity duration-150 ease-out",
          showBottomFade ? "opacity-100" : "opacity-0",
        )}
      />
    </>
  );
}

function MessageInputToolbar({
  emojiPickerOpen,
  setEmojiPickerOpen,
  stripColonOnEmojiPickRef,
  cursorRect,
  onAttachClick,
}: {
  emojiPickerOpen: boolean;
  setEmojiPickerOpen: (open: boolean) => void;
  stripColonOnEmojiPickRef: { current: boolean };
  cursorRect: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  } | null;
  onAttachClick?: () => void;
}) {
  const { editor } = useRichTextContext();

  return (
    <RichTextToolbar
      toolsStart={
        <EmojiPicker
          openPopover={emojiPickerOpen}
          setOpenPopover={setEmojiPickerOpen}
          onKeyboardDismissFocusEditor={() => editor?.commands.focus()}
          anchorRect={cursorRect}
          onSelect={(emoji) => {
            if (!editor) return;
            const stripColon = stripColonOnEmojiPickRef.current;
            stripColonOnEmojiPickRef.current = false;

            const { from } = editor.state.selection;
            if (
              stripColon &&
              from > 0 &&
              editor.state.doc.textBetween(from - 1, from) === ":"
            ) {
              editor
                .chain()
                .deleteRange({ from: from - 1, to: from })
                .insertContent(emoji)
                .run();
            } else {
              editor.chain().insertContent(emoji).run();
            }
            setTimeout(() => editor.commands.focus(), 0);
          }}
        >
          <RichTextToolbarButton icon={FaceSmile} label="Emoji" />
        </EmojiPicker>
      }
      toolsEnd={
        onAttachClick ? (
          <RichTextToolbarButton
            icon={Paperclip}
            label="Attach file"
            onClick={onAttachClick}
          />
        ) : undefined
      }
    />
  );
}
