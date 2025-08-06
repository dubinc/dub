import { cn } from "@dub/utils";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, EditorContext, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useMemo } from "react";
import { RichTextToolbar } from "./rich-text-toolbar";

export function RichTextArea({
  initialValue,
  onChange,
  className,
  editorClassName,
}: {
  initialValue?: string;
  onChange?: (value: string) => void;
  className?: string;
  editorClassName?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
      }),
      Placeholder.configure({
        placeholder: "Start typing...",
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:float-left before:text-content-muted before:h-0 before:pointer-events-none",
      }),
    ],
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm prose-neutral max-w-none focus:outline-none",
          editorClassName,
        ),
      },
    },
    content: initialValue,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    immediatelyRender: false,
  });

  const providerValue = useMemo(() => ({ editor }), [editor]);

  return (
    <EditorContext.Provider value={providerValue}>
      <div className={cn("flex flex-col gap-4", className)}>
        <RichTextToolbar />
        <EditorContent editor={editor} />
      </div>
    </EditorContext.Provider>
  );
}
