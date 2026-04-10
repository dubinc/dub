import { cn } from "@dub/utils";
import { EditorContent, EditorContentProps } from "@tiptap/react";
import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LoadingSpinner } from "../icons";
import { useRichTextContext } from "./rich-text-provider";

export * from "./rich-text-provider";
export * from "./rich-text-toolbar";

type LinkTooltipState = {
  href: string;
  rect: DOMRect;
};

export function RichTextArea({
  className,
  ...rest
}: Omit<EditorContentProps, "editor">) {
  const { editor, editable, features, isUploading } = useRichTextContext();
  const supportsLinks = features?.includes("links");

  return (
    <div
      className={cn(
        "relative",
        isUploading && "pointer-events-none opacity-50",
        className,
      )}
    >
      <EditorContent editor={editor} {...rest} />
      {editable !== false && supportsLinks && <RichTextAreaLinkTooltip />}

      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner className="size-4" />
        </div>
      )}
    </div>
  );
}

function RichTextAreaLinkTooltip() {
  const { editor, linkEditorOpen } = useRichTextContext();
  const [hoveredLink, setHoveredLink] = useState<{
    element: HTMLAnchorElement;
    href: string;
    rect: DOMRect;
  } | null>(null);

  useEffect(() => {
    if (!editor) return;

    const root = editor.view.dom as HTMLElement;
    const scrollElement =
      (editor.view as { scrollDOM?: HTMLElement }).scrollDOM ?? root;

    const updateHoveredLink = (link: HTMLAnchorElement | null) => {
      if (!link) {
        setHoveredLink(null);
        return;
      }

      setHoveredLink((current) =>
        current?.element === link
          ? {
              ...current,
              href: link.href,
              rect: link.getBoundingClientRect(),
            }
          : {
              element: link,
              href: link.href,
              rect: link.getBoundingClientRect(),
            },
      );
    };

    const onMouseOver = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;

      const link = event.target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement) || !root.contains(link)) return;

      updateHoveredLink(link);
    };

    const onMouseOut = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;

      const currentLink = event.target.closest("a[href]");
      if (!(currentLink instanceof HTMLAnchorElement)) return;

      const nextTarget =
        event.relatedTarget instanceof Element
          ? event.relatedTarget.closest("a[href]")
          : null;

      if (nextTarget === currentLink) return;

      setHoveredLink((current) =>
        current?.element === currentLink ? null : current,
      );
    };

    const syncHoveredLink = () => {
      setHoveredLink((current) => {
        if (!current?.element.isConnected) return null;

        return {
          ...current,
          href: current.element.href,
          rect: current.element.getBoundingClientRect(),
        };
      });
    };

    const onMouseLeave = () => {
      setHoveredLink(null);
    };

    root.addEventListener("mouseover", onMouseOver);
    root.addEventListener("mouseout", onMouseOut);
    root.addEventListener("mouseleave", onMouseLeave);
    scrollElement.addEventListener("scroll", syncHoveredLink, {
      passive: true,
    });
    window.addEventListener("resize", syncHoveredLink);

    return () => {
      root.removeEventListener("mouseover", onMouseOver);
      root.removeEventListener("mouseout", onMouseOut);
      root.removeEventListener("mouseleave", onMouseLeave);
      scrollElement.removeEventListener("scroll", syncHoveredLink);
      window.removeEventListener("resize", syncHoveredLink);
    };
  }, [editor]);

  if (!hoveredLink || linkEditorOpen || typeof document === "undefined") {
    return null;
  }

  return (
    <LinkUrlTooltipPortal href={hoveredLink.href} rect={hoveredLink.rect} />
  );
}

export function LinkHoverTooltip({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [tooltipState, setTooltipState] = useState<LinkTooltipState | null>(
    null,
  );

  useEffect(() => {
    if (!tooltipState) return;

    const updateRect = () => {
      const element = containerRef.current;
      if (!element) {
        setTooltipState(null);
        return;
      }

      setTooltipState({
        href,
        rect: element.getBoundingClientRect(),
      });
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [href, tooltipState]);

  return (
    <>
      <span
        ref={containerRef}
        className="inline"
        onMouseEnter={() => {
          const element = containerRef.current;
          if (!element) return;

          setTooltipState({
            href,
            rect: element.getBoundingClientRect(),
          });
        }}
        onMouseLeave={() => setTooltipState(null)}
      >
        {children}
      </span>
      {tooltipState && <LinkUrlTooltipPortal {...tooltipState} />}
    </>
  );
}

function LinkUrlTooltipPortal({ href, rect }: LinkTooltipState) {
  if (typeof document === "undefined") {
    return null;
  }

  const showBelow = rect.top < 72;

  return createPortal(
    <div
      className="pointer-events-none fixed z-[100] max-w-[400px] rounded-xl border border-neutral-200 bg-white px-3 py-2 text-left text-xs leading-snug text-neutral-700 shadow-lg"
      style={{
        left: rect.left + rect.width / 2,
        top: showBelow ? rect.bottom + 8 : rect.top - 8,
        transform: showBelow ? "translateX(-50%)" : "translate(-50%, -100%)",
        width: "max-content",
        maxWidth: "min(400px, calc(100vw - 2rem))",
        overflowWrap: "anywhere",
      }}
    >
      {href}
    </div>,
    document.body,
  );
}
