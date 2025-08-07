import { cn } from "@dub/utils";
import { computePosition, flip, shift } from "@floating-ui/dom";
import { Editor, posToDOMRect, ReactRenderer } from "@tiptap/react";
import { Command } from "cmdk";

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

function Menu({
  items,
  command,
}: {
  items: string[];
  command: (props: any) => void;
}) {
  return (
    <Command tabIndex={0} loop className="focus:outline-none">
      <Command.List className="border-border-subtle flex flex-col rounded-lg border bg-white p-1 shadow-sm">
        {items.length ? (
          items.map((item, index) => (
            <Command.Item
              key={index}
              onSelect={() => command({ id: item })}
              className={cn(
                "flex cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-md px-2 py-1 font-mono text-sm text-neutral-950",
                "data-[selected=true]:bg-neutral-100",
              )}
            >
              {item}
            </Command.Item>
          ))
        ) : (
          <div className="item">No result</div>
        )}
      </Command.List>
    </Command>
  );
}
