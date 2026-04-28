import { cn } from "@dub/utils";
import { useEditorState } from "@tiptap/react";
import {
  ReactNode,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "../button";
import {
  AtSign,
  Heading1,
  Heading2,
  Hyperlink,
  Icon,
  ImageIcon,
  TextBold,
  TextItalic,
  TextStrike,
} from "../icons";
import { Input } from "../input";
import { Modal } from "../modal";
import { useRichTextContext } from "./rich-text-provider";

function normalizeLinkUrl(url: string) {
  const trimmedUrl = url.trim();
  const allowedSchemes = new Set(["http", "https", "mailto"]);

  if (!trimmedUrl) return trimmedUrl;
  if (trimmedUrl.startsWith("//")) return `https:${trimmedUrl}`;

  const schemeMatch = trimmedUrl.match(/^([a-z][a-z0-9+.-]*):/i);
  if (schemeMatch) {
    return allowedSchemes.has(schemeMatch[1].toLowerCase()) ? trimmedUrl : "";
  }

  return `https://${trimmedUrl}`;
}

type LinkSelectionState = {
  from: number;
  to: number;
  text: string;
  href: string;
  isLink: boolean;
};

function getLinkRange(
  editor: NonNullable<ReturnType<typeof useRichTextContext>["editor"]>,
) {
  const { state } = editor;
  const linkMark = state.schema.marks.link;

  if (!linkMark || !editor.isActive("link")) {
    return null;
  }

  const currentHref = editor.getAttributes("link").href;

  const getAdjacentLinkHref = (side: "left" | "right", pos: number) => {
    const $pos = state.doc.resolve(pos);
    const mark =
      side === "left"
        ? $pos.nodeBefore?.marks.find((mark) => mark.type === linkMark)
        : $pos.nodeAfter?.marks.find((mark) => mark.type === linkMark);

    return mark?.attrs.href;
  };

  let from = state.selection.from;
  let to = state.selection.to;

  if (from === to) {
    if (from > 0 && state.doc.rangeHasMark(from - 1, from, linkMark)) {
      from -= 1;
    } else if (
      to < state.doc.content.size &&
      state.doc.rangeHasMark(to, to + 1, linkMark)
    ) {
      to += 1;
    }
  }

  while (
    from > 0 &&
    state.doc.rangeHasMark(from - 1, from, linkMark) &&
    getAdjacentLinkHref("left", from) === currentHref
  ) {
    from -= 1;
  }

  while (
    to < state.doc.content.size &&
    state.doc.rangeHasMark(to, to + 1, linkMark) &&
    getAdjacentLinkHref("right", to) === currentHref
  ) {
    to += 1;
  }

  return { from, to };
}

export function RichTextToolbar({
  toolsStart,
  toolsEnd,
  className,
}: {
  toolsStart?: ReactNode;
  toolsEnd?: ReactNode;
  className?: string;
}) {
  const { editor, features, handleImageUpload, isUploading } =
    useRichTextContext();

  const editorState = useEditorState({
    editor,
    selector: ({ editor }) => ({
      isBold: Boolean(editor?.isActive("bold")),
      isItalic: Boolean(editor?.isActive("italic")),
      isStrike: Boolean(editor?.isActive("strike")),
      isLink: Boolean(editor?.isActive("link")),
      isHeading1: Boolean(editor?.isActive("heading", { level: 1 })),
      isHeading2: Boolean(editor?.isActive("heading", { level: 2 })),
      isSelection: editor?.state.selection.from !== editor?.state.selection.to,
    }),
  });

  const inputImageRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={cn(
        "flex gap-1",
        isUploading && "pointer-events-none opacity-50",
        className,
      )}
    >
      {toolsStart}

      {features?.includes("bold") && (
        <RichTextToolbarButton
          icon={TextBold}
          label="Bold"
          isActive={editorState?.isBold}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        />
      )}
      {features?.includes("italic") && (
        <RichTextToolbarButton
          icon={TextItalic}
          label="Italic"
          isActive={editorState?.isItalic}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        />
      )}
      {features?.includes("strike") && (
        <RichTextToolbarButton
          icon={TextStrike}
          label="Strikethrough"
          isActive={editorState?.isStrike}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        />
      )}
      {features?.includes("headings") && (
        <>
          <RichTextToolbarButton
            icon={Heading1}
            label="Heading 1"
            isActive={editorState?.isHeading1}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 1 }).run()
            }
          />
          <RichTextToolbarButton
            icon={Heading2}
            label="Heading 2"
            isActive={editorState?.isHeading2}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
          />
        </>
      )}
      {features?.includes("links") && <LinkButton />}
      {features?.includes("variables") && (
        <RichTextToolbarButton
          icon={AtSign}
          label="Variable"
          isActive={false}
          onClick={() => {
            if (editor?.state.selection.$from.nodeBefore?.text?.endsWith("@")) {
              editor?.commands.focus();
              return;
            }
            editor?.chain().focus().insertContent("@").run();
          }}
        />
      )}

      {features?.includes("images") && handleImageUpload && editor && (
        <>
          <input
            ref={inputImageRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              handleImageUpload(file, editor, editor.state.selection.anchor);
              e.target.value = "";
            }}
          />
          <RichTextToolbarButton
            icon={ImageIcon}
            label="Image"
            isActive={false}
            onClick={() => inputImageRef.current?.click()}
          />
        </>
      )}

      {toolsEnd}
    </div>
  );
}

function LinkButton() {
  const { editor, linkEditorOpen, setLinkEditorOpen } = useRichTextContext();
  const linkInputRef = useRef<HTMLInputElement>(null);
  const [selectionState, setSelectionState] = useState<LinkSelectionState>({
    from: 0,
    to: 0,
    text: "",
    href: "",
    isLink: false,
  });
  const [textValue, setTextValue] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const textInputId = "rich-text-link-text-input";
  const linkInputId = "rich-text-link-url-input";

  const editorState = useEditorState({
    editor,
    selector: ({ editor }) => ({
      isLink: Boolean(editor?.isActive("link")),
      isSelection: editor?.state.selection.from !== editor?.state.selection.to,
    }),
  });

  const canOpenLinkEditor = useMemo(
    () => Boolean(editorState?.isSelection || editorState?.isLink),
    [editorState?.isLink, editorState?.isSelection],
  );

  useEffect(() => {
    if (!editor || !linkEditorOpen) return;

    const { selection, doc } = editor.state;
    const linkRange = getLinkRange(editor);
    const from = linkRange?.from ?? selection.from;
    const to = linkRange?.to ?? selection.to;
    const text = doc.textBetween(from, to, "\n");
    const href = editor.getAttributes("link").href ?? "";

    setSelectionState({
      from,
      to,
      text,
      href,
      isLink: Boolean(linkRange),
    });
    setTextValue(text);
    setUrlValue(href);
  }, [editor, linkEditorOpen]);

  useEffect(() => {
    if (!linkEditorOpen) return;

    requestAnimationFrame(() => {
      linkInputRef.current?.focus();
      linkInputRef.current?.select();
    });
  }, [linkEditorOpen]);

  useEffect(() => {
    if (!editor) return;

    const root = editor.view.dom as HTMLElement;

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== "k"
      ) {
        return;
      }

      if (!canOpenLinkEditor) return;

      event.preventDefault();
      event.stopPropagation();
      setLinkEditorOpen(true);
    };

    root.addEventListener("keydown", onKeyDown);

    return () => {
      root.removeEventListener("keydown", onKeyDown);
    };
  }, [canOpenLinkEditor, editor, setLinkEditorOpen]);

  const closeModal = () => {
    setLinkEditorOpen(false);
  };

  const deleteLink = () => {
    if (!editor) return;

    editor
      .chain()
      .focus()
      .setTextSelection({
        from: selectionState.from,
        to: selectionState.to,
      })
      .unsetLink()
      .run();

    closeModal();
  };

  const saveLink = () => {
    if (!editor) return;

    const normalizedUrl = normalizeLinkUrl(urlValue);
    const nextText = textValue;

    if (!normalizedUrl || !nextText.trim()) return;

    const chain = editor.chain().focus();

    if (selectionState.text !== nextText) {
      chain.insertContentAt(
        {
          from: selectionState.from,
          to: selectionState.to,
        },
        nextText,
      );
    }

    chain
      .setTextSelection({
        from: selectionState.from,
        to: selectionState.from + nextText.length,
      })
      .setLink({ href: normalizedUrl })
      .run();

    closeModal();
  };

  return (
    <>
      <RichTextToolbarButton
        icon={Hyperlink}
        label="Link"
        isActive={editorState?.isLink}
        onClick={() => setLinkEditorOpen(true)}
        disabled={!canOpenLinkEditor}
      />

      <Modal showModal={linkEditorOpen} setShowModal={setLinkEditorOpen}>
        <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
          <h3 className="text-lg font-medium leading-none">
            {selectionState.isLink ? "Edit link" : "Add link"}
          </h3>
        </div>

        <div className="bg-neutral-50 p-4 sm:p-6">
          <div className="space-y-4">
            <div>
              <label
                htmlFor={textInputId}
                className="mb-1 block text-sm font-medium text-neutral-700"
              >
                Text
              </label>
              <Input
                id={textInputId}
                value={textValue}
                onChange={(event) => setTextValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;

                  event.preventDefault();
                  saveLink();
                }}
                className="max-w-none"
              />
            </div>

            <div>
              <label
                htmlFor={linkInputId}
                className="mb-1 block text-sm font-medium text-neutral-700"
              >
                Link
              </label>
              <Input
                id={linkInputId}
                ref={linkInputRef}
                value={urlValue}
                onChange={(event) => setUrlValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;

                  event.preventDefault();
                  saveLink();
                }}
                placeholder="https://example.com"
                className="max-w-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
          <div>
            {selectionState.isLink && (
              <button
                type="button"
                onClick={deleteLink}
                className="rounded-md px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
              >
                Delete link
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={closeModal}
              variant="secondary"
              text="Cancel"
              className="h-8 w-fit px-3"
            />
            <Button
              type="button"
              onClick={saveLink}
              text="Save"
              disabled={!textValue.trim() || !urlValue.trim()}
              className="h-8 w-fit px-3"
            />
          </div>
        </div>
      </Modal>
    </>
  );
}

type RichTextToolbarButtonProps = {
  icon: Icon;
  label?: string;
  isActive?: boolean;
  onClick?: () => void;
  disabled?: boolean;
};

export const RichTextToolbarButton = forwardRef<
  HTMLButtonElement,
  RichTextToolbarButtonProps
>(
  (
    {
      icon: Icon,
      label,
      isActive,
      onClick,
      disabled,
    }: RichTextToolbarButtonProps,
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "flex size-8 items-center justify-center rounded-md transition-colors duration-150 disabled:opacity-50",
          isActive
            ? "bg-neutral-200"
            : "hover:bg-neutral-50 active:bg-neutral-100",
        )}
        title={label}
      >
        <Icon className="size-4 shrink-0 text-neutral-700" />
        {label && <span className="sr-only">{label}</span>}
      </button>
    );
  },
);
