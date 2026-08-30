"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRichTextContext } from "./rich-text-provider";

/**
 * Tooltip that shows a link's full URL when hovering it inside the editor.
 * The editor's anchors are rendered by ProseMirror (outside React), so this
 * tracks hover via DOM events rather than wrapping the elements.
 */
export function RichTextLinkHoverTooltip() {
  const { editor, linkModalState } = useRichTextContext();
  const [hovered, setHovered] = useState<{
    href: string;
    rect: DOMRect;
  } | null>(null);

  useEffect(() => {
    if (!editor) return;

    const dom = editor.view.dom as HTMLElement;

    const onMouseOver = (e: MouseEvent) => {
      const anchor =
        e.target instanceof Element ? e.target.closest("a[href]") : null;

      if (anchor && dom.contains(anchor)) {
        setHovered({
          href: anchor.getAttribute("href") ?? "",
          rect: anchor.getBoundingClientRect(),
        });
      }
    };

    const onMouseOut = (e: MouseEvent) => {
      const anchor =
        e.target instanceof Element ? e.target.closest("a[href]") : null;
      const toAnchor =
        e.relatedTarget instanceof Element
          ? e.relatedTarget.closest("a[href]")
          : null;

      if (anchor && anchor !== toAnchor) setHovered(null);
    };

    const clear = () => setHovered(null);

    dom.addEventListener("mouseover", onMouseOver);
    dom.addEventListener("mouseout", onMouseOut);
    window.addEventListener("scroll", clear, true);

    return () => {
      dom.removeEventListener("mouseover", onMouseOver);
      dom.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("scroll", clear, true);
    };
  }, [editor]);

  if (!hovered || linkModalState) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed z-[99] -translate-x-1/2 -translate-y-full"
      style={{
        left: hovered.rect.left + hovered.rect.width / 2,
        top: hovered.rect.top - 8,
      }}
    >
      <div className="animate-slide-up-fade border-border-default bg-bg-default text-content-default max-w-[200px] break-all rounded-xl border px-2.5 py-1.5 text-xs shadow-sm">
        {hovered.href}
      </div>
    </div>,
    document.body,
  );
}
