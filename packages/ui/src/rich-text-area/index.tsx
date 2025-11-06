import { cn } from "@dub/utils";
import { EditorContent } from "@tiptap/react";
import { LoadingSpinner } from "../icons";
import { useRichTextContext } from "./rich-text-provider";

export * from "./rich-text-provider";
export * from "./rich-text-toolbar";

export function RichTextArea({ className }: { className?: string }) {
  const { editor, isUploading, handleImageUpload } = useRichTextContext();

  return (
    <div
      className={cn(
        "relative",
        isUploading && "pointer-events-none opacity-50",
        className,
      )}
    >
      <EditorContent editor={editor} />

      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner className="size-4" />
        </div>
      )}
    </div>
  );
}
