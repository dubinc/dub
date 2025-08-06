import { cn } from "@dub/utils";
import { useCurrentEditor, useEditorState } from "@tiptap/react";
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

export function RichTextToolbar() {
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

  return (
    <div className="flex gap-1">
      <ToolbarButton
        icon={TextBold}
        isActive={editorState?.isBold}
        onClick={() => editor?.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        icon={TextItalic}
        isActive={editorState?.isItalic}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        icon={Heading1}
        isActive={editorState?.isHeading1}
        onClick={() =>
          editor?.chain().focus().toggleHeading({ level: 1 }).run()
        }
      />
      <ToolbarButton
        icon={Heading2}
        isActive={editorState?.isHeading2}
        onClick={() =>
          editor?.chain().focus().toggleHeading({ level: 2 }).run()
        }
      />

      <ToolbarButton
        icon={Link4}
        isActive={false}
        onClick={() => alert("WIP")}
      />
      <ToolbarButton
        icon={AtSign}
        isActive={false}
        onClick={() => alert("WIP")}
      />
      <ToolbarButton
        icon={ImageIcon}
        isActive={false}
        onClick={() => alert("WIP")}
      />
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  isActive,
  onClick,
}: {
  icon: Icon;
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
    >
      <Icon className="size-4 shrink-0 text-neutral-700" />
    </button>
  );
}
