import { cn } from "@dub/utils";
import { computePosition, flip, shift } from "@floating-ui/dom";
import { Editor, posToDOMRect, ReactRenderer } from "@tiptap/react";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

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
        if (props.event.key === "Escape") {
          component.destroy();

          return true;
        }

        return component.ref?.onKeyDown(props);
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

    const upHandler = () => {
      setSelectedIndex((selectedIndex + items.length - 1) % items.length);
    };

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % items.length);
    };

    const enterHandler = () => {
      command({ id: items[selectedIndex] });
    };

    useEffect(() => setSelectedIndex(0), [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === "ArrowUp") {
          upHandler();
          return true;
        }

        if (event.key === "ArrowDown") {
          downHandler();
          return true;
        }

        if (event.key === "Enter") {
          enterHandler();
          return true;
        }

        return false;
      },
    }));

    return (
      <div className="border-border-subtle flex flex-col rounded-lg border bg-white p-1 shadow-sm">
        {items.length ? (
          items.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => command({ id: item })}
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
