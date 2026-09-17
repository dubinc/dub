import { cn } from "@dub/utils";
import FileHandler from "@tiptap/extension-file-handler";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import { TableKit } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { Editor, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  PropsWithChildren,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { configureCampaignEditorImage } from "./campaign-editor-image";
import { RichTextLinkHoverTooltip } from "./link-hover-tooltip";
import { RichTextLinkModal } from "./link-modal";
import { TableHoverControls } from "./table-hover-controls";
import { RichTextVariableInfo, suggestions } from "./variables";

export const PROSE_STYLES = {
  default: "prose-p:my-2 prose-ul:my-2 prose-ol:my-2",
  condensed: "prose-p:my-0 prose-ul:my-2 prose-ol:my-2",
  chat: "prose-p:my-0 prose-ul:my-2 prose-ol:my-2 [&_p+p]:mt-2",
  relaxed: "",
} as const;

const CORE_FEATURES = [
  "images",
  "variables",
  "links",
  "headings",
  "bold",
  "italic",
  "strike",
] as const;

const FEATURES = [
  ...CORE_FEATURES,
  "lists",
  "tables",
  "quote",
  "code",
] as const;

export const DEFAULT_RICH_TEXT_FEATURES = CORE_FEATURES;

const OPTIONAL_FEATURES = ["imageControls"] as const;

export type RichTextFeature =
  | (typeof FEATURES)[number]
  | (typeof OPTIONAL_FEATURES)[number];

type RichTextProviderProps = PropsWithChildren<{
  placeholder?: string;
  initialValue?: any;
  features?: RichTextFeature[];
  markdown?: boolean;
  style?: keyof typeof PROSE_STYLES;
  onChange?: (editor: Editor) => void;
  uploadImage?: (file: File) => Promise<string | null>;
  variables?: string[];
  variableInfo?: Record<string, RichTextVariableInfo>;
  editable?: boolean;
  autoFocus?: boolean;

  editorProps?: Parameters<typeof useEditor>[0]["editorProps"];
  editorClassName?: string;
}>;

export type RichTextLinkModalState = {
  from: number;
  to: number;
  text: string;
  href: string;
};

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
      linkModalState: RichTextLinkModalState | null;
      setLinkModalState: (state: RichTextLinkModalState | null) => void;
      openLinkModal: (pos?: number) => void;
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
      features = DEFAULT_RICH_TEXT_FEATURES as any,
      markdown = false,
      style = "default",
      placeholder = "Start typing...",
      uploadImage,
      editable,
      autoFocus,
      variables,
      variableInfo,
      initialValue,
      onChange,
      editorProps,
      editorClassName,
    }: RichTextProviderProps,
    ref,
  ) => {
    const [isUploading, setIsUploading] = useState(false);

    const [linkModalState, setLinkModalState] =
      useState<RichTextLinkModalState | null>(null);

    // Ref to avoid stale closures in editorProps handlers below
    const editorRef = useRef<Editor | null>(null);

    const openLinkModal = useCallback((pos?: number) => {
      const editor = editorRef.current;
      if (!editor) return;

      const chain = editor.chain();
      if (pos !== undefined) chain.setTextSelection(pos);
      chain.run();

      if (editor.isActive("link")) editor.chain().extendMarkRange("link").run();

      const { from, to } = editor.state.selection;

      setLinkModalState({
        from,
        to,
        text: editor.state.doc.textBetween(from, to, " "),
        href: editor.getAttributes("link").href ?? "",
      });
    }, []);

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

        ...(features.includes("tables")
          ? [
              TableKit.configure({
                table: {
                  resizable: false,
                  HTMLAttributes: {
                    class: "w-full border-separate border-spacing-0",
                  },
                },
              }),
            ]
          : []),

        ...(features.includes("links")
          ? [
              Link.extend({
                inclusive: false,
              }).configure({
                // Clicking a link opens the edit modal instead of the URL
                openOnClick: false,
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
              ...(features.includes("imageControls")
                ? [
                    configureCampaignEditorImage({
                      inline: false,
                      imageAltControls: true,
                      HTMLAttributes: {
                        class: "rounded-lg max-w-full h-auto",
                      },
                    }),
                  ]
                : [
                    Image.configure({
                      inline: false,
                      HTMLAttributes: {
                        class: "rounded-lg max-w-full h-auto",
                      },
                    }),
                  ]),
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
                addAttributes() {
                  return {
                    ...this.parent?.(),
                    fallback: {
                      default: null,
                      parseHTML: (element) =>
                        element.getAttribute("data-fallback"),
                      renderHTML: (attrs) =>
                        attrs.fallback
                          ? { "data-fallback": attrs.fallback }
                          : {},
                    },
                  };
                },
                renderHTML({ node }: { node: any }) {
                  const label = node.attrs.fallback
                    ? `{{${node.attrs.id} | ${node.attrs.fallback}}}`
                    : `{{${node.attrs.id}}}`;
                  return [
                    "span",
                    {
                      class:
                        "px-1 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold",
                      "data-type": "mention",
                      "data-id": node.attrs.id,
                      ...(node.attrs.fallback
                        ? { "data-fallback": node.attrs.fallback }
                        : {}),
                    },
                    label,
                  ];
                },
                renderText({ node }: { node: any }) {
                  return node.attrs.fallback
                    ? `{{${node.attrs.id} | ${node.attrs.fallback}}}`
                    : `{{${node.attrs.id}}}`;
                },
              }).configure({
                suggestion: suggestions(variables, variableInfo),
              }),
            ]
          : []),
      ],
      editorProps: {
        ...editorProps,
        attributes: {
          ...editorProps?.attributes,
          class: cn(
            "max-w-none focus:outline-none",
            "prose prose-sm prose-neutral",
            // Tiptap wraps each list item's content in a <p>, which Typography treats as a
            // "loose" list and gives paragraph spacing. Zero it so items sit 4px apart (the
            // <li> margins), and match the bullet color to the ordered list counters.
            "[&_li>p]:my-0 marker:prose-ul:text-neutral-500",
            features.includes("tables") &&
              "[&_table]:my-3 [&_table]:overflow-hidden [&_table]:rounded-xl [&_table]:border [&_table]:border-neutral-200 [&_th]:border-b [&_th]:border-r [&_td]:border-b [&_td]:border-r [&_th]:border-neutral-200 [&_td]:border-neutral-200 [&_th]:bg-neutral-50 [&_th]:px-4 [&_td]:px-4 [&_th]:py-3 [&_td]:py-3 [&_th]:align-top [&_td]:align-top [&_th]:text-left [&_th]:font-semibold [&_th]:text-neutral-900 [&_td]:text-neutral-600 [&_th:last-child]:border-r-0 [&_td:last-child]:border-r-0 [&_tr:last-child>*]:border-b-0 [&_th>p]:my-0 [&_td>p]:my-0",
            PROSE_STYLES[style],
            "[&_.ProseMirror-selectednode]:outline [&_.ProseMirror-selectednode]:outline-2 [&_.ProseMirror-selectednode]:outline-blue-500 [&_.ProseMirror-selectednode]:outline-offset-2",
            "[&_.ProseMirror-selectednode:has(img)]:outline-none",
            editorClassName,
          ),
        },
        handleClick: (view, pos, event) => {
          if (editorProps?.handleClick?.(view, pos, event)) return true;

          // Open the link edit modal when clicking a link in the editor
          if (
            view.editable &&
            features.includes("links") &&
            event.target instanceof Element &&
            event.target.closest("a[href]")
          ) {
            openLinkModal(pos);
            return true;
          }

          return false;
        },
      },
      content: initialValue,
      contentType: markdown ? "markdown" : undefined,
      onUpdate: ({ editor }) => onChange?.(editor),
      immediatelyRender: false,
    });

    editorRef.current = editor;

    useEffect(() => {
      editor?.setEditable(editable ?? true);
    }, [editor, editable]);

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
          linkModalState,
          setLinkModalState,
          openLinkModal,
        }}
      >
        {children}

        {features.includes("links") && (
          <>
            <RichTextLinkModal />
            <RichTextLinkHoverTooltip />
          </>
        )}

        {features.includes("tables") && (editable ?? true) && (
          <TableHoverControls />
        )}
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

export function useRichTextLength() {
  const { editor } = useRichTextContext();

  return (
    useEditorState({
      editor,
      selector: ({ editor }) =>
        editor?.getText({ blockSeparator: "" }).length ?? 0,
    }) ?? 0
  );
}
