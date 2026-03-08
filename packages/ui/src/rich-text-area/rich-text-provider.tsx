import { cn } from "@dub/utils";
import FileHandler from "@tiptap/extension-file-handler";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
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

export const PROSE_STYLES = {
  default: "prose-p:my-2 prose-ul:my-2 prose-ol:my-2",
  condensed: "prose-p:my-0 prose-ul:my-2 prose-ol:my-2",
  relaxed: "",
} as const;

const FEATURES = [
  "images",
  "variables",
  "links",
  "headings",
  "bold",
  "italic",
  "strike",
] as const;

type RichTextProviderProps = PropsWithChildren<{
  placeholder?: string;
  initialValue?: any;
  features?: (typeof FEATURES)[number][];
  markdown?: boolean;
  style?: keyof typeof PROSE_STYLES;
  onChange?: (editor: Editor) => void;
  uploadImage?: (file: File) => Promise<string | null>;
  variables?: string[];
  editable?: boolean;
  autoFocus?: boolean;

  editorProps?: Parameters<typeof useEditor>[0]["editorProps"];
  editorClassName?: string;
}>;

export const RichTextContext = createContext<
  | (Pick<
      RichTextProviderProps,
      "features" | "markdown" | "variables" | "editable"
    > & {
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
      features = FEATURES as any,
      markdown = false,
      style = "default",
      placeholder = "Start typing...",
      uploadImage,
      editable,
      autoFocus,
      variables,
      initialValue,
      onChange,
      editorProps,
      editorClassName,
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
      editable: editable ?? true, // Explicitly pass `true` to make sure placeholder works
      autofocus: autoFocus ? "end" : false,
      extensions: [
        ...(markdown ? [Markdown] : []),
        StarterKit.configure({
          heading: features.includes("headings")
            ? {
                levels: [1, 2],
              }
            : false,
          bold: features.includes("bold") ? undefined : false,
          italic: features.includes("italic") ? undefined : false,
          strike: features.includes("strike") ? undefined : false,
          link: false,
        }),

        ...(features.includes("links")
          ? [
              Link.extend({
                inclusive: false,
              }),
            ]
          : []),

        Placeholder.configure({
          placeholder,
          emptyEditorClass:
            "before:content-[attr(data-placeholder)] before:float-left before:text-content-muted before:h-0 before:pointer-events-none",
        }),

        // Images
        ...(features.includes("images") && handleImageUpload
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
        ...(features.includes("variables") && variables
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
          ...editorProps?.attributes,
          class: cn(
            "max-w-none focus:outline-none",
            "prose prose-sm prose-neutral",
            PROSE_STYLES[style],
            "[&_.ProseMirror-selectednode]:outline [&_.ProseMirror-selectednode]:outline-2 [&_.ProseMirror-selectednode]:outline-blue-500 [&_.ProseMirror-selectednode]:outline-offset-2",
            editorClassName,
          ),
        },
        ...editorProps,
      },
      content: initialValue,
      contentType: markdown ? "markdown" : undefined,
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
          features,
          markdown,
          editable,
          variables,
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
