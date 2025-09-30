"use client";

import useProgram from "@/lib/swr/use-program";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import Link from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading1, Heading2, Italic, LinkIcon } from "lucide-react";
import { useCallback } from "react";

export function CampaignEditor() {
  const { program, loading } = useProgram();

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
      }),
      Link.configure({
        openOnClick: false,
        enableClickSelection: true,
        linkOnPaste: true,
        autolink: true,
        defaultProtocol: "https",
        protocols: ["http", "https"],
        HTMLAttributes: {
          class: "text-blue-600 underline cursor-pointer",
        },
      }),
    ],
    content: "<p>Hello World!</p>",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[400px] py-3",
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL:", previousUrl);

    if (url === null) {
      return;
    }

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  const toolbarButtons = [
    {
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      isDisabled: () => !editor.can().chain().focus().toggleBold().run(),
    },
    {
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      isDisabled: () => !editor.can().chain().focus().toggleItalic().run(),
    },
    {
      icon: Heading1,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isDisabled: () =>
        !editor.can().chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isDisabled: () =>
        !editor.can().chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      icon: LinkIcon,
      action: setLink,
      isDisabled: () => false,
      isActive: () => editor.isActive("link"),
    },
  ];

  return (
    <div className="">
      <div className="mb-6 flex items-center gap-1">
        {toolbarButtons.map(({ icon: Icon, action, isDisabled }, idx) => (
          <ToolbarButton
            key={idx}
            icon={Icon}
            onClick={action}
            disabled={isDisabled()}
          />
        ))}
      </div>

      {loading ? (
        <div className="size-8 animate-pulse rounded-full bg-neutral-100" />
      ) : (
        <img
          src={program?.logo ?? `${OG_AVATAR_URL}${program?.id}`}
          alt={`${program?.name} avatar`}
          className="size-8 rounded-full"
          draggable={false}
        />
      )}

      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  onClick,
  disabled,
  icon: Icon,
}: {
  onClick: () => void;
  disabled: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-8 rounded-md px-2 hover:bg-neutral-100",
        disabled && "cursor-not-allowed opacity-50",
      )}
      type="button"
    >
      <Icon className="size-4" />
    </button>
  );
}
