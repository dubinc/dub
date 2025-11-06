import { cn } from "@dub/utils";
import FileHandler from "@tiptap/extension-file-handler";
import Image from "@tiptap/extension-image";
import Mention from "@tiptap/extension-mention";
import { Placeholder } from "@tiptap/extensions";
import { Editor, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  PropsWithChildren,
  createContext,
  forwardRef,
  useContext,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { suggestions } from "./variables";

type RichTextProviderProps = PropsWithChildren<{
  placeholder?: string;
  initialValue?: any;
  onChange?: (editor: Editor) => void;
  uploadImage?: (file: File) => Promise<string | null>;
  variables?: string[];
  editable?: boolean;
  editorClassName?: string;
}>;

export const RichTextContext = createContext<
  | (RichTextProviderProps & {
      editor: Editor | null;
      isUploading: boolean;
      handleImageUpload:
        | ((file: File, currentEditor: Editor, pos: number) => Promise<void>)
        | null;
    })
  | null
>(null);

export type RichTextAreaProviderRef = {
  setContent: (content: any) => void;
};

export const RichTextProvider = forwardRef<
  RichTextAreaProviderRef,
  RichTextProviderProps
>(
  (
    {
      children,
      placeholder = "Start typing...",
      uploadImage,
      editable,
      editorClassName,
      variables,
      initialValue,
      onChange,
    }: RichTextProviderProps,
    ref,
  ) => {
    const [isUploading, setIsUploading] = useState(false);

    const handleImageUpload = useMemo(
      () =>
        uploadImage
          ? async (file: File, currentEditor: Editor, pos: number) => {
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
            }
          : null,
      [uploadImage],
    );

    const editor = useEditor({
      editable: editable,
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2],
          },
        }),
        Placeholder.configure({
          placeholder,
          emptyEditorClass:
            "before:content-[attr(data-placeholder)] before:float-left before:text-content-muted before:h-0 before:pointer-events-none",
        }),

        // Images
        ...(handleImageUpload
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

    return (
      <RichTextContext.Provider
        value={{
          placeholder,
          editable,
          variables,
          initialValue,
          onChange,
          uploadImage,
          editorClassName,
          editor,
          isUploading,
          handleImageUpload,
        }}
      >
        {children}
      </RichTextContext.Provider>
    );
  },
);

export function useRichTextContext() {
  const context = useContext(RichTextContext);

  if (!context)
    throw new Error(
      "useRichTextContext must be used within a RichTextProvider",
    );

  return context;
}
