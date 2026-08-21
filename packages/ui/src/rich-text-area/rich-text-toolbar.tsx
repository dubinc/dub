import { cn, isSafeLinkHref } from "@dub/utils";
import { useEditorState } from "@tiptap/react";
import { ReactNode, forwardRef, useRef } from "react";
import { toast } from "sonner";
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
  const { editor, features } = useRichTextContext();
  const imageControlsEnabled = features?.includes("imageControls");

  const editorState = useEditorState({
    editor,
    selector: ({ editor }) => ({
      isTextSelection:
        editor?.state.selection.from !== editor?.state.selection.to,
      isImageSelected: Boolean(editor?.isActive("image")),
      isLinkActive: Boolean(
        editor?.isActive("link") ||
          (imageControlsEnabled &&
            editor?.isActive("image") &&
            editor.getAttributes("image").href),
      ),
    }),
  });

  const canLink =
    editorState?.isTextSelection ||
    editorState?.isLinkActive ||
    (imageControlsEnabled && editorState?.isImageSelected);

  return (
    <RichTextToolbarButton
      icon={Hyperlink}
      label="Link"
      isActive={editorState?.isLinkActive}
      onClick={() => {
        if (!editor) return;

        const isImageSelected = editor.isActive("image");

        if (isImageSelected && imageControlsEnabled) {
          const previousUrl = editor.getAttributes("image").href ?? "";
          const url = window.prompt("Link URL", previousUrl);
          const nodePos = editor.state.selection.from;

          if (url === null) return;

          if (!url.trim()) {
            editor
              .chain()
              .focus()
              .updateAttributes("image", { href: null })
              .setNodeSelection(nodePos)
              .run();
            return;
          }

          if (!isSafeLinkHref(url.trim())) {
            toast.error(
              "Enter a full URL starting with http://, https://, or mailto: (e.g. https://dub.co).",
            );
            editor.chain().focus().setNodeSelection(nodePos).run();
            return;
          }

          editor
            .chain()
            .focus()
            .updateAttributes("image", { href: url.trim() })
            .setNodeSelection(nodePos)
            .run();
          return;
        }

        const previousUrl = editor.getAttributes("link").href;

        const url = window.prompt("Link URL", previousUrl);

        if (url === null) return;

        if (!url.trim()) {
          editor.chain().focus().extendMarkRange("link").unsetLink().run();
          return;
        }

        if (!isSafeLinkHref(url.trim())) {
          toast.error(
            "Enter a full URL starting with http://, https://, or mailto: (e.g. https://dub.co).",
          );
          return;
        }

        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: url.trim() })
          .run();
      }}
      disabled={!canLink}
    />
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
