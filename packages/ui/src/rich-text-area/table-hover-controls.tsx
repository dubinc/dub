"use client";

import { cn } from "@dub/utils";
import type { Editor } from "@tiptap/react";
import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { GripDotsVertical, Plus } from "../icons";
import { useRichTextContext } from "./rich-text-provider";

const CONTROL_ATTR = "data-table-controls";
const EDGE_PX = 10;

type HoverZone =
  | {
      kind: "add-row";
      table: HTMLTableElement;
    }
  | {
      kind: "add-col";
      table: HTMLTableElement;
    }
  | {
      kind: "row";
      table: HTMLTableElement;
      row: HTMLTableRowElement;
      cell: HTMLTableCellElement;
    }
  | {
      kind: "col";
      table: HTMLTableElement;
      cell: HTMLTableCellElement;
    };

type MenuState = {
  kind: "row" | "col";
  cellPos: number;
};

export function TableHoverControls() {
  const { editor, editable } = useRichTextContext();
  const [zone, setZone] = useState<HoverZone | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!editor || editable === false) return;

    const remasure = () => setTick((value) => value + 1);
    const editorDom = editor.view.dom as HTMLElement;

    const onMouseMove = (event: MouseEvent) => {
      const el = document.elementFromPoint(event.clientX, event.clientY);
      if (el instanceof Element && el.closest(`[${CONTROL_ATTR}]`)) return;
      if (menu) return;

      setZone(getHoverZone(event.clientX, event.clientY, editorDom));
    };

    document.addEventListener("mousemove", onMouseMove);
    window.addEventListener("scroll", remasure, true);
    window.addEventListener("resize", remasure);
    editor.on("update", remasure);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("scroll", remasure, true);
      window.removeEventListener("resize", remasure);
      editor.off("update", remasure);
    };
  }, [editor, editable, menu]);

  useEffect(() => {
    if (!menu) return;

    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest(`[${CONTROL_ATTR}]`)
      ) {
        return;
      }
      setMenu(null);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(null);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menu]);

  if (!editor || editable === false || !zone?.table.isConnected) {
    return null;
  }

  const tableRect = zone.table.getBoundingClientRect();
  const visible = intersectRect(
    tableRect,
    (editor.view.dom as HTMLElement).getBoundingClientRect(),
  );

  const runOnCell = (cellPos: number, command: () => void) => {
    editor.chain().focus().setTextSelection(cellPos).run();
    command();
    setMenu(null);
    setZone(null);
  };

  const lastRowCell = zone.table.rows[zone.table.rows.length - 1]?.cells[0];
  const lastColCell =
    zone.table.rows[0]?.cells[zone.table.rows[0].cells.length - 1];

  const addRowPos = visible && {
    x: visible.left + visible.width / 2,
    y: tableRect.bottom,
  };

  const addColPos = visible && {
    x: tableRect.right,
    y: visible.top + visible.height / 2,
  };

  let menuPos: { top: number; left: number } | null = null;
  if (menu && zone.kind === "row") {
    const rowRect = zone.row.getBoundingClientRect();
    menuPos = {
      top: rowRect.top + rowRect.height / 2,
      left: tableRect.left - 16,
    };
  } else if (menu && zone.kind === "col") {
    const colRect = getColumnRect(zone.table, zone.cell.cellIndex);
    if (colRect) {
      menuPos = {
        top: tableRect.top - 16,
        left: colRect.left + colRect.width / 2,
      };
    }
  }

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[99]">
      {zone.kind === "add-row" && lastRowCell && addRowPos && (
        <ControlButton
          label="Add row"
          style={{
            top: addRowPos.y,
            left: addRowPos.x,
            transform: "translate(-50%, -50%)",
          }}
          onClick={() =>
            runOnCell(posAtCell(editor, lastRowCell), () =>
              editor.chain().focus().addRowAfter().run(),
            )
          }
        >
          <Plus className="size-3.5" />
        </ControlButton>
      )}

      {zone.kind === "add-col" && lastColCell && addColPos && (
        <ControlButton
          label="Add column"
          style={{
            top: addColPos.y,
            left: addColPos.x,
            transform: "translate(-50%, -50%)",
          }}
          onClick={() =>
            runOnCell(posAtCell(editor, lastColCell), () =>
              editor.chain().focus().addColumnAfter().run(),
            )
          }
        >
          <Plus className="size-3.5" />
        </ControlButton>
      )}

      {zone.kind === "row" && (
        <RowHandle editor={editor} zone={zone} menu={menu} setMenu={setMenu} />
      )}

      {zone.kind === "col" && (
        <ColumnHandle
          editor={editor}
          zone={zone}
          menu={menu}
          setMenu={setMenu}
        />
      )}

      {menu && menuPos && (
        <div
          data-table-controls=""
          className="pointer-events-auto absolute min-w-36 rounded-lg border border-neutral-200 bg-white p-1 shadow-md"
          style={{
            top: menuPos.top,
            left: menuPos.left,
            transform:
              menu.kind === "row"
                ? "translate(-100%, -50%)"
                : "translate(-50%, -100%)",
          }}
        >
          {menu.kind === "row" ? (
            <>
              <MenuButton
                onClick={() =>
                  runOnCell(menu.cellPos, () =>
                    editor.chain().focus().addRowBefore().run(),
                  )
                }
              >
                Insert row above
              </MenuButton>
              <MenuButton
                onClick={() =>
                  runOnCell(menu.cellPos, () =>
                    editor.chain().focus().addRowAfter().run(),
                  )
                }
              >
                Insert row below
              </MenuButton>
              <MenuButton
                danger
                onClick={() =>
                  runOnCell(menu.cellPos, () =>
                    editor.chain().focus().deleteRow().run(),
                  )
                }
              >
                Delete row
              </MenuButton>
              <div className="my-1 h-px bg-neutral-200" />
              <MenuButton
                danger
                onClick={() =>
                  runOnCell(menu.cellPos, () =>
                    editor.chain().focus().deleteTable().run(),
                  )
                }
              >
                Delete table
              </MenuButton>
            </>
          ) : (
            <>
              <MenuButton
                onClick={() =>
                  runOnCell(menu.cellPos, () =>
                    editor.chain().focus().addColumnBefore().run(),
                  )
                }
              >
                Insert column left
              </MenuButton>
              <MenuButton
                onClick={() =>
                  runOnCell(menu.cellPos, () =>
                    editor.chain().focus().addColumnAfter().run(),
                  )
                }
              >
                Insert column right
              </MenuButton>
              <MenuButton
                danger
                onClick={() =>
                  runOnCell(menu.cellPos, () =>
                    editor.chain().focus().deleteColumn().run(),
                  )
                }
              >
                Delete column
              </MenuButton>
              <div className="my-1 h-px bg-neutral-200" />
              <MenuButton
                danger
                onClick={() =>
                  runOnCell(menu.cellPos, () =>
                    editor.chain().focus().deleteTable().run(),
                  )
                }
              >
                Delete table
              </MenuButton>
            </>
          )}
        </div>
      )}
    </div>,
    document.body,
  );
}

function RowHandle({
  editor,
  zone,
  menu,
  setMenu,
}: {
  editor: Editor;
  zone: Extract<HoverZone, { kind: "row" }>;
  menu: MenuState | null;
  setMenu: (menu: MenuState | null) => void;
}) {
  const tableRect = zone.table.getBoundingClientRect();
  const rowRect = zone.row.getBoundingClientRect();

  return (
    <ControlButton
      label="Row options"
      style={{
        top: rowRect.top + rowRect.height / 2,
        left: tableRect.left,
        transform: "translate(-50%, -50%)",
      }}
      active={menu?.kind === "row"}
      onClick={() => {
        const cellPos = posAtCell(editor, zone.cell);
        setMenu(menu?.kind === "row" ? null : { kind: "row", cellPos });
      }}
    >
      <GripDotsVertical className="size-3.5" />
    </ControlButton>
  );
}

function ColumnHandle({
  editor,
  zone,
  menu,
  setMenu,
}: {
  editor: Editor;
  zone: Extract<HoverZone, { kind: "col" }>;
  menu: MenuState | null;
  setMenu: (menu: MenuState | null) => void;
}) {
  const tableRect = zone.table.getBoundingClientRect();
  const colRect = getColumnRect(zone.table, zone.cell.cellIndex);
  if (!colRect) return null;

  return (
    <ControlButton
      label="Column options"
      style={{
        top: tableRect.top,
        left: colRect.left + colRect.width / 2,
        transform: "translate(-50%, -50%)",
      }}
      active={menu?.kind === "col"}
      onClick={() => {
        const cellPos = posAtCell(editor, zone.cell);
        setMenu(menu?.kind === "col" ? null : { kind: "col", cellPos });
      }}
    >
      <GripDotsVertical className="size-3.5 rotate-90" />
    </ControlButton>
  );
}

function ControlButton({
  label,
  style,
  active,
  onClick,
  children,
}: {
  label: string;
  style: CSSProperties;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      style={style}
      data-table-controls=""
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={onClick}
      className={cn(
        "pointer-events-auto absolute flex size-5 items-center justify-center rounded-md border bg-white text-neutral-500 shadow-sm",
        "hover:bg-neutral-50 hover:text-neutral-800",
        active
          ? "border-neutral-300 bg-neutral-50 text-neutral-800"
          : "border-neutral-200",
      )}
    >
      {children}
      <span className="sr-only">{label}</span>
    </button>
  );
}

function MenuButton({
  children,
  onClick,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={onClick}
      className={cn(
        "flex h-8 w-full items-center rounded-md px-2 text-left text-xs font-medium",
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-neutral-700 hover:bg-neutral-50",
      )}
    >
      {children}
    </button>
  );
}

function getHoverZone(
  x: number,
  y: number,
  editorDom: HTMLElement,
): HoverZone | null {
  const clip = editorDom.getBoundingClientRect();
  const tables = editorDom.querySelectorAll("table");

  for (const table of tables) {
    if (!(table instanceof HTMLTableElement)) continue;

    const rect = table.getBoundingClientRect();
    const visible = intersectRect(rect, clip);
    if (!visible) continue;

    const nearVisible =
      x >= visible.left - EDGE_PX &&
      x <= visible.right + EDGE_PX &&
      y >= visible.top - EDGE_PX &&
      y <= visible.bottom + EDGE_PX;

    if (!nearVisible) continue;

    const distBottom = Math.abs(y - rect.bottom);
    const distRight = Math.abs(x - rect.right);
    const distLeft = Math.abs(x - rect.left);
    const distTop = Math.abs(y - rect.top);
    const alongX = x >= visible.left && x <= visible.right;
    const alongY = y >= visible.top && y <= visible.bottom;
    const bottomVisible = rect.bottom >= clip.top && rect.bottom <= clip.bottom;
    const rightVisible = rect.right >= clip.left && rect.right <= clip.right;
    const leftVisible = rect.left >= clip.left && rect.left <= clip.right;
    const topVisible = rect.top >= clip.top && rect.top <= clip.bottom;

    if (
      bottomVisible &&
      alongX &&
      distBottom <= EDGE_PX &&
      distBottom <= distRight
    ) {
      return { kind: "add-row", table };
    }

    if (
      rightVisible &&
      alongY &&
      distRight <= EDGE_PX &&
      distRight <= distBottom
    ) {
      return { kind: "add-col", table };
    }

    if (leftVisible && alongY && distLeft <= EDGE_PX && distLeft < distRight) {
      const row =
        [...table.rows].find((candidate) => {
          const rowRect = candidate.getBoundingClientRect();
          return y >= rowRect.top && y <= rowRect.bottom;
        }) ?? null;
      const cell = row?.cells[0];
      if (row && cell) return { kind: "row", table, row, cell };
    }

    if (topVisible && alongX && distTop <= EDGE_PX && distTop < distBottom) {
      const header = table.rows[0];
      const cell = header
        ? [...header.cells].find((candidate) => {
            const cellRect = candidate.getBoundingClientRect();
            return x >= cellRect.left && x <= cellRect.right;
          }) ?? null
        : null;
      if (cell) return { kind: "col", table, cell };
    }
  }

  return null;
}

function posAtCell(editor: Editor, cell: HTMLTableCellElement) {
  return editor.view.posAtDOM(cell, 0);
}

function intersectRect(a: DOMRect, b: DOMRect) {
  const left = Math.max(a.left, b.left);
  const right = Math.min(a.right, b.right);
  const top = Math.max(a.top, b.top);
  const bottom = Math.min(a.bottom, b.bottom);

  if (left >= right || top >= bottom) return null;

  return new DOMRect(left, top, right - left, bottom - top);
}

function getColumnRect(table: HTMLTableElement, columnIndex: number) {
  const cells = [...table.rows]
    .map((row) => row.cells[columnIndex])
    .filter(Boolean);

  if (!cells.length) return null;

  const first = cells[0].getBoundingClientRect();
  const last = cells[cells.length - 1].getBoundingClientRect();

  return new DOMRect(
    first.left,
    first.top,
    first.width,
    last.bottom - first.top,
  );
}
