"use client";

import { cn } from "@dub/utils";
import type { ImageOptions } from "@tiptap/extension-image";
import { NodeViewWrapper, ReactNodeViewProps } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../button";
import { Input } from "../input";
import { Popover } from "../popover";

export function ImageAltNodeView({
  node,
  editor,
  updateAttributes,
  extension,
  selected,
}: ReactNodeViewProps) {
  const [open, setOpen] = useState(false);
  const [altText, setAltText] = useState(node.attrs.alt ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  const htmlAttributes = (extension.options as Partial<ImageOptions>)
    .HTMLAttributes;

  const hasAlt = Boolean(node.attrs.alt?.trim());
  const isEditable = editor.isEditable;

  useEffect(() => {
    setAltText(node.attrs.alt ?? "");
  }, [node.attrs.alt]);

  useEffect(() => {
    if (!isEditable) {
      setOpen(false);
    }
  }, [isEditable]);

  const saveAlt = useCallback(
    (value: string) => {
      if (!editor.isEditable) {
        return;
      }

      const trimmed = value.trim();
      updateAttributes({ alt: trimmed || null });
    },
    [editor, updateAttributes],
  );

  const stopEvent = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <NodeViewWrapper
      as="div"
      className="mx-auto block w-fit max-w-full leading-none [&.ProseMirror-selectednode]:outline-none"
    >
      <div
        className={cn(
          "group relative w-fit max-w-full rounded-lg",
          selected && "ring-2 ring-blue-500 ring-offset-2",
        )}
      >
        <img
          src={node.attrs.src}
          alt={node.attrs.alt || ""}
          title={node.attrs.title ?? undefined}
          draggable
          data-drag-handle
          {...(node.attrs.href ? { "data-linked-image": "" } : {})}
          className={cn(htmlAttributes?.class, "block")}
        />

        {isEditable && (
          <div
            className={cn(
              "absolute bottom-2 right-2 z-10 transition-opacity duration-150",
              hasAlt || open
                ? "opacity-100"
                : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100",
            )}
            contentEditable={false}
          >
            <Popover
              openPopover={open}
              setOpenPopover={setOpen}
              align="end"
              side="bottom"
              sideOffset={6}
              forceDropdown
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                inputRef.current?.focus();
              }}
              content={
                <div className="w-72 p-3">
                  <p className="text-content-subtle mb-1 text-xs leading-relaxed">
                    Add alt text to describe this image. This makes your email
                    more accessible and could increase your delivery rates.
                  </p>

                  <Input
                    ref={inputRef}
                    type="text"
                    value={altText}
                    placeholder="Alt text"
                    onChange={(event) => setAltText(event.target.value)}
                    onBlur={() => saveAlt(altText)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        saveAlt(altText);
                        setOpen(false);
                      }
                    }}
                    className="max-w-none"
                  />
                </div>
              }
            >
              <Button
                type="button"
                variant="secondary"
                text="Alt"
                className="h-7 w-auto px-2.5 text-xs"
                onMouseDown={stopEvent}
              />
            </Popover>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
