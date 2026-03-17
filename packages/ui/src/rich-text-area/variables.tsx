import { cn } from "@dub/utils";
import { computePosition, flip, shift } from "@floating-ui/dom";
import { Editor, posToDOMRect, ReactRenderer } from "@tiptap/react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Button } from "../button";
import { Input } from "../input";

const updatePosition = (editor: Editor, element: HTMLElement) => {
  const virtualElement = {
    getBoundingClientRect: () =>
      posToDOMRect(
        editor.view,
        editor.state.selection.from,
        editor.state.selection.to,
      ),
  };

  computePosition(virtualElement, element, {
    placement: "bottom-start",
    strategy: "absolute",
    middleware: [shift(), flip()],
  }).then(({ x, y, strategy }) => {
    element.style.width = "max-content";
    element.style.position = strategy;
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
  });
};

export const suggestions = (variables: string[]) => ({
  items: ({ query }: { query: string }) =>
    variables
      .filter((item) => item.toLowerCase().startsWith(query.toLowerCase()))
      .slice(0, 5),

  render: () => {
    let component: any;

    return {
      onStart: (props: {
        editor: Editor;
        clientRect?: (() => DOMRect | null) | null;
        command?: (props: any) => void;
      }) => {
        component = new ReactRenderer(Menu, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) return;

        component.element.style.position = "absolute";

        document.body.appendChild(component.element);

        updatePosition(props.editor, component.element);
      },

      onUpdate(props: any) {
        component.updateProps(props);

        if (!props.clientRect) return;

        updatePosition(props.editor, component.element);
      },

      onKeyDown(props: any) {
        const handled = component.ref?.onKeyDown(props);
        if (handled) return true;

        if (props.event.key === "Escape") {
          component.destroy();
          return true;
        }

        return false;
      },

      onExit() {
        component.element.remove();
        component.destroy();
      },
    };
  },
});

const menuItemClassName = cn(
  "flex cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-md px-2 py-1 font-mono text-sm text-neutral-950",
  "data-[selected=true]:bg-neutral-100",
);

const Menu = forwardRef(
  (
    {
      items,
      command,
    }: {
      items: string[];
      command: (props: any) => void;
    },
    ref,
  ) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [pendingVar, setPendingVar] = useState<string | null>(null);
    const [fallback, setFallback] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const upHandler = () => {
      setSelectedIndex((selectedIndex + items.length - 1) % items.length);
    };

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % items.length);
    };

    const selectVar = (item: string) => {
      setPendingVar(item);
      setFallback("");
    };

    const confirmFallback = () => {
      if (!pendingVar) return;
      command({ id: pendingVar, fallback: fallback.trim() || null });
    };

    const cancelFallback = () => {
      setPendingVar(null);
      setFallback("");
    };

    useEffect(() => setSelectedIndex(0), [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (pendingVar) {
          if (event.key === "Enter") {
            event.preventDefault();
            confirmFallback();
            return true;
          }
          if (event.key === "Escape") {
            cancelFallback();
            return true;
          }
          return false;
        }

        if (event.key === "ArrowUp") {
          upHandler();
          return true;
        }

        if (event.key === "ArrowDown") {
          downHandler();
          return true;
        }

        if (event.key === "Enter") {
          if (items.length > 0 && selectedIndex >= 0 && selectedIndex < items.length) {
            selectVar(items[selectedIndex]);
            return true;
          }
          return false;
        }

        return false;
      },
    }));

    if (pendingVar) {
      return (
        <div className="border-border-subtle flex w-64 flex-col gap-2 rounded-lg border bg-white p-2 shadow-sm">
          <span className="w-fit rounded bg-blue-100 px-1 py-0.5 font-mono text-xs font-semibold text-blue-700">
            {pendingVar}
          </span>

          <div className="flex flex-col gap-1">
            <Input
              ref={(el) => {
                inputRef.current = el;
                el?.focus();
              }}
              value={fallback}
              onChange={(e) => setFallback(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmFallback();
                } else if (e.key === "Escape") {
                  cancelFallback();
                }
              }}
              placeholder="Fallback (optional)"
              className="h-8 rounded-lg"
            />
            <p className="text-content-subtle text-xs">
              Used only if {pendingVar} is missing.
            </p>
          </div>

          <div className="flex justify-end gap-1">
            <Button
              text="Back"
              variant="secondary"
              className="h-7 w-fit rounded-lg px-3 py-2 text-sm"
              onClick={cancelFallback}
            />
            <Button
              text="Confirm"
              variant="primary"
              className="h-7 w-fit rounded-lg px-3 py-2 text-sm"
              onClick={confirmFallback}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="border-border-subtle flex flex-col rounded-lg border bg-white p-1 shadow-sm">
        {items.length ? (
          items.map((item, index) => (
            <button
              key={index}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectVar(item)}
              data-selected={selectedIndex === index}
              onPointerEnter={() => setSelectedIndex(index)}
              className={menuItemClassName}
            >
              {item}
            </button>
          ))
        ) : (
          <div
            className={cn(menuItemClassName, "text-content-subtle font-sans")}
          >
            No results
          </div>
        )}
      </div>
    );
  },
);
