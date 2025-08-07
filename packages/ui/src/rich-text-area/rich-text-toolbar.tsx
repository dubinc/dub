import { cn } from "@dub/utils";
import { useCurrentEditor, useEditorState } from "@tiptap/react";
import { useRef } from "react";
import {
  AtSign,
  Heading1,
  Heading2,
  Icon,
  ImageIcon,
  Link4,
  TextBold,
  TextItalic,
} from "../icons";

export function RichTextToolbar({
  onImageUpload,
}: {
  onImageUpload?: (file: File) => void;
}) {
  const { editor } = useCurrentEditor();

  const editorState = useEditorState({
    editor,
    selector: ({ editor }) => ({
      isBold: Boolean(editor?.isActive("bold")),
      isItalic: Boolean(editor?.isActive("italic")),
      isHeading1: Boolean(editor?.isActive("heading", { level: 1 })),
      isHeading2: Boolean(editor?.isActive("heading", { level: 2 })),
    }),
  });

  const inputImageRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex gap-1">
      <ToolbarButton
        icon={TextBold}
        label="Bold"
        isActive={editorState?.isBold}
        onClick={() => editor?.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        icon={TextItalic}
        label="Italic"
        isActive={editorState?.isItalic}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        icon={Heading1}
        label="Heading 1"
        isActive={editorState?.isHeading1}
        onClick={() =>
          editor?.chain().focus().toggleHeading({ level: 1 }).run()
        }
      />
      <ToolbarButton
        icon={Heading2}
        label="Heading 2"
        isActive={editorState?.isHeading2}
        onClick={() =>
          editor?.chain().focus().toggleHeading({ level: 2 }).run()
        }
      />

      <ToolbarButton
        icon={Link4}
        label="Link"
        isActive={false}
        onClick={() => alert("WIP")}
      />
      <ToolbarButton
        icon={AtSign}
        label="Variable"
        isActive={false}
        onClick={() => alert("WIP")}
      />

      {onImageUpload && (
        <>
          <input
            ref={inputImageRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              onImageUpload(file);
              e.target.value = "";
            }}
          />
          <ToolbarButton
            icon={ImageIcon}
            label="Image"
            isActive={false}
            onClick={() => inputImageRef.current?.click()}
          />
        </>
      )}
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  icon: Icon;
  label?: string;
  isActive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md transition-colors duration-150",
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
}
