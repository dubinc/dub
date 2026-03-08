import { cn } from "@dub/utils";
import { useEditorState } from "@tiptap/react";
import { ReactNode, forwardRef, useRef } from "react";
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
import { useRichTextContext } from "./rich-text-provider";

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
  const { editor } = useRichTextContext();

  const editorState = useEditorState({
    editor,
    selector: ({ editor }) => ({
      isSelection: editor?.state.selection.from !== editor?.state.selection.to,
    }),
  });

  return (
    <RichTextToolbarButton
      icon={Hyperlink}
      label="Link"
      onClick={() => {
        if (!editor) return;
        const previousUrl = editor.getAttributes("link").href;

        const url = window.prompt("Link URL", previousUrl);

        if (!url?.trim()) {
          editor.chain().focus().extendMarkRange("link").unsetLink().run();
          return;
        }

        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: url })
          .run();
      }}
      disabled={!editorState?.isSelection}
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
