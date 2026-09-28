"use client";

import { useRichTextContext } from "@dub/ui";
import { cn } from "@dub/utils";
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import { gemoji } from "gemoji";
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type EmojiShortcode = {
  emoji: string;
  shortcode: string;
};

const RESULT_LIMIT = 20;

const primaryShortcodes: EmojiShortcode[] = gemoji.map((entry) => ({
  emoji: entry.emoji,
  shortcode: entry.names[0],
}));

const allShortcodes: EmojiShortcode[] = gemoji.flatMap((entry) =>
  entry.names.map((shortcode) => ({
    emoji: entry.emoji,
    shortcode,
  })),
);

function searchEmojiShortcodes(query: string) {
  const normalized = query.toLowerCase();

  if (!normalized) return primaryShortcodes.slice(0, RESULT_LIMIT);

  return allShortcodes
    .filter((item) => item.shortcode.startsWith(normalized))
    .sort((a, b) => {
      if (a.shortcode.length !== b.shortcode.length) {
        return a.shortcode.length - b.shortcode.length;
      }
      return a.shortcode.localeCompare(b.shortcode);
    })
    .slice(0, RESULT_LIMIT);
}

const EMOJI_TOKEN = /(?:^|[\s\0\n]):([a-z0-9_+-]*)$/i;

// `\0` is a one-character stand-in for leaf nodes, so the index matches a
// ProseMirror parent offset.
function matchEmojiToken(textBeforeCaret: string) {
  const match = textBeforeCaret.match(EMOJI_TOKEN);
  if (!match || match.index === undefined) return null;

  return {
    query: match[1],
    colonIndex: match.index + match[0].lastIndexOf(":"),
  };
}

type RichTextEditor = NonNullable<
  ReturnType<typeof useRichTextContext>["editor"]
>;

type EmojiToken = {
  query: string;
  from: number;
  to: number;
};

export type InlineEmojiAutocompleteHandle = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

function readEmojiToken(editor: RichTextEditor): EmojiToken | null {
  const { selection } = editor.state;
  if (!selection.empty) return null;

  const { $from } = selection;
  // `\0` stands in for leaf nodes (hard breaks) and is one character, so the
  // string index lines up with the parent offset.
  const textBeforeCaret = $from.parent.textBetween(
    0,
    $from.parentOffset,
    "\n",
    "\0",
  );
  const match = matchEmojiToken(textBeforeCaret);
  if (!match) return null;

  return {
    query: match.query,
    from: $from.start() + match.colonIndex,
    to: $from.pos,
  };
}

export const InlineEmojiAutocomplete = forwardRef<
  InlineEmojiAutocompleteHandle,
  { suspended?: boolean }
>(function InlineEmojiAutocomplete({ suspended = false }, ref) {
  const { editor } = useRichTextContext();
  const listboxId = useId();
  const [token, setToken] = useState<EmojiToken | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const query = token?.query ?? "";
  const results = useMemo(
    () =>
      token && !dismissed && !suspended ? searchEmojiShortcodes(query) : [],
    [token, dismissed, suspended, query],
  );
  const open = results.length > 0;
  const activeIndexClamped = results.length
    ? Math.min(activeIndex, results.length - 1)
    : 0;
  const activeOptionId = `${listboxId}-option-${activeIndexClamped}`;

  const { refs, floatingStyles, update } = useFloating({
    open,
    placement: "top-start",
    strategy: "fixed",
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    if (suspended) setDismissed(true);
  }, [suspended]);

  useEffect(() => {
    if (!editor) return;

    const syncToken = () => {
      const next = readEmojiToken(editor);
      setToken((current) =>
        current?.query === next?.query &&
        current?.from === next?.from &&
        current?.to === next?.to
          ? current
          : next,
      );
      if (!next) setDismissed(false);
    };

    syncToken();
    editor.on("update", syncToken);
    editor.on("selectionUpdate", syncToken);

    return () => {
      editor.off("update", syncToken);
      editor.off("selectionUpdate", syncToken);
    };
  }, [editor]);

  useEffect(() => {
    activeIndexRef.current = 0;
    setActiveIndex(0);
  }, [query]);

  useLayoutEffect(() => {
    if (!open || !editor) return;

    refs.setPositionReference({
      getBoundingClientRect: () => {
        const coords = editor.view.coordsAtPos(editor.state.selection.from);
        return new DOMRect(
          coords.left,
          coords.top,
          coords.right - coords.left,
          coords.bottom - coords.top,
        );
      },
    });
  }, [open, editor, token?.from, token?.to, refs]);

  useEffect(() => {
    if (!open) return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    const onViewportChange = () => update();
    viewport.addEventListener("resize", onViewportChange);
    viewport.addEventListener("scroll", onViewportChange);

    return () => {
      viewport.removeEventListener("resize", onViewportChange);
      viewport.removeEventListener("scroll", onViewportChange);
    };
  }, [open, update]);

  useEffect(() => {
    if (!open || !editor) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target)) return;
      if (editor.view.dom.contains(target)) return;
      setDismissed(true);
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, editor]);

  useEffect(() => {
    if (!open) return;
    menuRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndexClamped}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndexClamped, query]);

  useEffect(() => {
    if (!open || !editor) return;

    const dom = editor.view.dom;
    dom.setAttribute("aria-controls", listboxId);
    dom.setAttribute("aria-expanded", "true");
    dom.setAttribute("aria-autocomplete", "list");
    dom.setAttribute("aria-activedescendant", activeOptionId);

    return () => {
      dom.removeAttribute("aria-controls");
      dom.removeAttribute("aria-expanded");
      dom.removeAttribute("aria-autocomplete");
      dom.removeAttribute("aria-activedescendant");
    };
  }, [open, editor, listboxId, activeOptionId]);

  const selectIndex = (index: number) => {
    const next = results[index];
    if (!next || !editor || !token) return;

    editor
      .chain()
      .focus()
      .deleteRange({ from: token.from, to: token.to })
      .insertContent(next.emoji)
      .run();
  };

  useImperativeHandle(
    ref,
    () => ({
      onKeyDown: (event) => {
        if (!open || event.isComposing) return false;

        if (event.key === "ArrowDown") {
          event.preventDefault();
          const next = (activeIndexRef.current + 1) % results.length;
          activeIndexRef.current = next;
          setActiveIndex(next);
          return true;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          const next =
            (activeIndexRef.current - 1 + results.length) % results.length;
          activeIndexRef.current = next;
          setActiveIndex(next);
          return true;
        }

        if (
          (event.key === "Enter" && !event.metaKey && !event.ctrlKey) ||
          event.key === "Tab"
        ) {
          event.preventDefault();
          const index = Math.min(
            activeIndexRef.current,
            Math.max(results.length - 1, 0),
          );
          selectIndex(index);
          return true;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          setDismissed(true);
          return true;
        }

        return false;
      },
    }),
    [open, results, editor, token],
  );

  if (!open) return null;

  return (
    <FloatingPortal>
      <div
        ref={(node) => {
          menuRef.current = node;
          refs.setFloating(node);
        }}
        id={listboxId}
        style={floatingStyles}
        role="listbox"
        aria-label="Emoji suggestions"
        onMouseDown={(event) => event.preventDefault()}
        className="border-border-subtle bg-bg-default z-[60] flex max-h-52 w-max min-w-40 max-w-[min(18rem,calc(100vw-16px))] flex-col overflow-y-auto rounded-lg border p-1 shadow-sm"
      >
        {results.map((item, index) => {
          const selected = index === activeIndexClamped;

          return (
            <button
              key={item.shortcode}
              id={`${listboxId}-option-${index}`}
              type="button"
              role="option"
              aria-selected={selected}
              data-index={index}
              data-selected={selected}
              onPointerEnter={() => {
                activeIndexRef.current = index;
                setActiveIndex(index);
              }}
              onClick={() => selectIndex(index)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                "data-[selected=true]:bg-bg-subtle",
              )}
            >
              <span className="w-5 shrink-0 text-center text-base leading-none">
                {item.emoji}
              </span>
              <span className="text-content-subtle truncate">
                {item.shortcode}
              </span>
            </button>
          );
        })}
      </div>
    </FloatingPortal>
  );
});
