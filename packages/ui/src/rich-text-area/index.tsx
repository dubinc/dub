import { cn } from "@dub/utils";
import FileHandler from "@tiptap/extension-file-handler";
import Image from "@tiptap/extension-image";
import Mention from "@tiptap/extension-mention";
import { Placeholder } from "@tiptap/extensions";
import { Editor, EditorContent, EditorContext, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { LoadingSpinner } from "../icons";
import { RichTextToolbar } from "./rich-text-toolbar";
import { suggestions } from "./variables";

export const richTextAreaExtensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2],
    },
  }),
];

interface RichTextAreaProps {
  initialValue?: any;
  onChange?: (editor: Editor) => void;
  placeholder?: string;
  className?: string;
  editorClassName?: string;
  uploadImage?: (file: File) => Promise<string | null>;
  variables?: string[];
}

export interface RichTextAreaRef {
  setContent: (content: any) => void;
}

export const RichTextArea = forwardRef<RichTextAreaRef, RichTextAreaProps>(
  function RichTextArea(
    {
      initialValue,
      onChange,
      placeholder = "Start typing...",
      className,
      editorClassName,
      uploadImage,
      variables,
    },
    ref,
  ) {
    const [isUploading, setIsUploading] = useState(false);

    const handleImageUpload = async (
      file: File,
      currentEditor: Editor,
      pos: number,
    ) => {
      setIsUploading(true);

      const src = await uploadImage?.(file);
      if (!src) {
        setIsUploading(false);
        return;
      }

      currentEditor
        .chain()
        .insertContentAt(pos, {
          type: "image",
          attrs: {
            src,
          },
        })
        .focus()
        .run();

      setIsUploading(false);
    };

    const editor = useEditor({
      extensions: [
        ...richTextAreaExtensions,
        Placeholder.configure({
          placeholder,
          emptyEditorClass:
            "before:content-[attr(data-placeholder)] before:float-left before:text-content-muted before:h-0 before:pointer-events-none",
        }),

        // Images
        ...(uploadImage
          ? [
              Image.configure({
                inline: false,
                HTMLAttributes: {
                  class: "rounded-lg max-w-full h-auto",
                },
              }),
              FileHandler.configure({
                allowedMimeTypes: [
                  "image/png",
                  "image/jpeg",
                  "image/gif",
                  "image/webp",
                ],
                onDrop: (currentEditor, files, pos) => {
                  files.forEach((file) =>
                    handleImageUpload(file, currentEditor, pos),
                  );
                },
                onPaste: (currentEditor, files, htmlContent) => {
                  if (htmlContent) return false;
                  files.forEach((file) =>
                    handleImageUpload(
                      file,
                      currentEditor,
                      currentEditor.state.selection.anchor,
                    ),
                  );
                },
              }),
            ]
          : []),
        ...(variables
          ? [
              Mention.extend({
                renderHTML({ node }: { node: any }) {
                  return [
                    "span",
                    {
                      class:
                        "px-1 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold",
                      "data-type": "mention",
                      "data-id": node.attrs.id,
                    },
                    `{{${node.attrs.id}}}`,
                  ];
                },
                renderText({ node }: { node: any }) {
                  return `{{${node.attrs.id}}}`;
                },
              }).configure({
                suggestion: suggestions(variables),
              }),
            ]
          : []),
      ],
      editorProps: {
        attributes: {
          class: cn(
            "prose prose-sm prose-neutral max-w-none focus:outline-none",
            "[&_.ProseMirror-selectednode]:outline [&_.ProseMirror-selectednode]:outline-2 [&_.ProseMirror-selectednode]:outline-blue-500 [&_.ProseMirror-selectednode]:outline-offset-2",
            editorClassName,
          ),
        },
      },
      content: initialValue,
      onUpdate: ({ editor }) => onChange?.(editor),
      immediatelyRender: false,
    });

    useImperativeHandle(ref, () => ({
      setContent: (content: any) => {
        editor?.commands.setContent(content);
      },
    }));

    const providerValue = useMemo(() => ({ editor }), [editor]);

    return (
      <EditorContext.Provider value={providerValue}>
        <div
          className={cn(
            "relative flex flex-col gap-4",
            isUploading && "pointer-events-none opacity-50",
            className,
          )}
        >
          <RichTextToolbar
            onImageUpload={
              uploadImage && editor
                ? (file) =>
                    handleImageUpload(
                      file,
                      editor,
                      editor.state.selection.anchor,
                    )
                : undefined
            }
          />
          <EditorContent editor={editor} />

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <LoadingSpinner className="size-4" />
            </div>
          )}
        </div>
      </EditorContext.Provider>
    );
  },
);
